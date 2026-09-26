import { useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import { Button, Card, ConfirmationSheet, ErrorState, Heading, KeyValue, LoadingState, Message, Screen, T, colors } from "../src/components/ui";
import { ApprovalBadge, FareBreakdown, PolicyReasons, StatusTimeline } from "../src/components/Corporate";
import { corp, corpPost } from "../src/services/api";
import { uncertain } from "../src/services/errors";
import { useApp } from "../src/state/Providers";
import type { Approval, Quote } from "../src/types";
import { assertOnline } from "../src/utils/offline";
import { approvalQuoteInput, approvedRideInput, dateTime, label, money, quoteExpired } from "../src/utils/journey";

export default function ApprovalDetail() {
  const { id, submitted } = useLocalSearchParams<{ id: string; submitted?: string }>();
  const { session, online } = useApp();
  const client = useQueryClient();
  const q = useQuery({ queryKey: ["approvals", session?.user.id, id], queryFn: ({ signal }) => corp<Approval>("approvals", `?id=${encodeURIComponent(id)}`, signal), enabled: !!session && !!id });
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<"" | "book" | "cancel">("");
  const [interrupted, setInterrupted] = useState(false);
  const submitting = useRef(false);
  const a = q.data;
  const ride = a?.ride;
  async function freshQuote() {
    if (!a) return;
    setBusy("quote");
    setError("");
    try {
      assertOnline(online);
      setQuote(await corpPost<Quote>("quote", approvalQuoteInput(a, Crypto.randomUUID())));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function act(kind: "book" | "cancel") {
    if (!a || submitting.current) return;
    submitting.current = true;
    setBusy(kind);
    setError("");
    try {
      assertOnline(online);
      if (kind === "cancel") {
        await corpPost("approvals", { action: "CANCEL", id: a.id });
        await Promise.all([q.refetch(), client.invalidateQueries({ queryKey: ["home"] })]);
      } else {
        const booking = await corpPost<{ id: string }>("book", approvedRideInput(a, quote!));
        await Promise.all([client.invalidateQueries({ queryKey: ["trips"] }), client.invalidateQueries({ queryKey: ["home"] }), client.invalidateQueries({ queryKey: ["approvals"] })]);
        router.replace({ pathname: "/trip", params: { id: booking.id, confirmed: "1" } });
      }
    } catch (e) {
      setError((e as Error).message);
      if (kind === "book" && uncertain(e)) setInterrupted(true);
    } finally {
      setConfirm("");
      setBusy("");
      submitting.current = false;
    }
  }
  const overApproved = !!quote && !!a?.amount && Number(quote.fare.finalPayable) > Number(a.amount);
  const quoteOk = !!quote && !quoteExpired(quote) && !overApproved && quote.policy.decision !== "NOT_ALLOWED";
  return (
    <Screen title="Ride request" subtitle={a ? `Submitted ${dateTime(a.submittedAt)}` : undefined} refresh={() => void q.refetch()} refreshing={q.isRefetching}>
      {q.isPending && <LoadingState />}
      <ErrorState error={q.error} retry={() => void q.refetch()} />
      {submitted && a?.status === "PENDING" && <Message tone={colors.emerald} text="Request submitted. You will be notified when your company decides." />}
      {a && (
        <>
          <Card>
            <ApprovalBadge status={a.status} />
            {ride ? (
              <>
                <Heading>{ride.route.pickupCity}{ride.route.dropCity ? ` to ${ride.route.dropCity}` : ""}</Heading>
                <KeyValue k="Pickup" v={dateTime(ride.pickupDateTime)} />
                <KeyValue k="Package" v={ride.route.packageName} />
                <KeyValue k="Vehicle" v={`${ride.vehicle.make} ${ride.vehicle.model} · ${label(ride.vehicle.category)}`} />
                <KeyValue k="Vendor" v={ride.vendorName} />
                <KeyValue k="From" v={ride.pickupAddress} />
                <KeyValue k="To" v={ride.dropAddress} />
                <KeyValue k="Requested amount" v={money(a.amount)} />
                {!!ride.note && <KeyValue k="Your note" v={ride.note} />}
              </>
            ) : (
              <T muted>Ride details are not available for this request.</T>
            )}
          </Card>
          {!!ride?.policyReasons.length && (
            <Card tone={colors.amber}>
              <Heading>Why approval was needed</Heading>
              <PolicyReasons policy={{ decision: "APPROVAL_REQUIRED", reasons: ride.policyReasons }} />
            </Card>
          )}
          <Card>
            <Heading>Approval progress</Heading>
            <StatusTimeline
              items={[
                { title: "Submitted", at: a.submittedAt, done: true },
                ...a.steps.map((s) => ({ title: `${label(s.stage)} review: ${label(s.status)}`, at: s.actedAt, done: s.status !== "PENDING", note: s.remarks })),
                ...(a.rawStatus === "CANCELLED" ? [{ title: "Cancelled by you", at: a.completedAt, done: true }] : []),
              ]}
            />
            {a.status === "EXPIRED" && <T muted size={13}>The requested pickup time has passed. Submit a new request if you still need a ride.</T>}
          </Card>
          {a.booking && (
            <Card tone={colors.brand}>
              <Heading>Booked as {a.booking.bookingNumber}</Heading>
              <Button title="View trip" secondary onPress={() => router.push({ pathname: "/trip", params: { id: a.booking!.id } })} />
            </Card>
          )}
          {a.status === "APPROVED" && (
            <Card tone={colors.emerald}>
              <Heading>Confirm your approved ride</Heading>
              <T muted size={13}>Availability and price are checked again now. The ride books only if the fresh fare is within the approved {money(a.amount)}.</T>
              {!quote && <Button title="Get fresh price" icon="refresh" busy={busy === "quote"} disabled={!online} onPress={() => void freshQuote()} />}
              {quote && (
                <>
                  <FareBreakdown fare={quote.fare} />
                  {overApproved && <Message text="The current fare is higher than the approved amount. Submit a new request from Book Ride." />}
                  {quote.policy.decision === "NOT_ALLOWED" && <PolicyReasons policy={quote.policy} />}
                  {quoteExpired(quote) && <Button title="Refresh price" secondary disabled={!online} onPress={() => void freshQuote()} />}
                  {interrupted && <Message tone={colors.amber} text="The response was interrupted. Your booking may already exist. Check again safely with the same quote." />}
                  <Button title="Book approved ride" icon="checkmark-circle-outline" busy={busy === "book"} disabled={!online || !quoteOk} onPress={() => (interrupted ? void act("book") : setConfirm("book"))} />
                </>
              )}
            </Card>
          )}
          <Message text={error} />
          {(a.status === "PENDING" || a.status === "APPROVED") && !a.booking && <Button title="Cancel request" secondary disabled={!online || !!busy} onPress={() => setConfirm("cancel")} />}
        </>
      )}
      <ConfirmationSheet
        visible={!!confirm}
        busy={!!busy}
        title={confirm === "book" ? "Book this approved ride?" : "Cancel this request?"}
        body={confirm === "book" ? `Book for ${dateTime(ride?.pickupDateTime)} at ${money(quote?.fare.finalPayable)}.` : "Your approver will no longer see it as pending. This cannot be undone."}
        confirm={confirm === "book" ? "Book ride" : "Cancel request"}
        onConfirm={() => void act(confirm as "book" | "cancel")}
        onCancel={() => setConfirm("")}
      />
    </Screen>
  );
}

import { useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, ConfirmationSheet, EmptyState, ErrorState, Field, Heading, KeyValue, LoadingState, Message, Row, Screen, T, colors } from "../src/components/ui";
import { ApprovalBadge, PolicyReasons, StatusTimeline } from "../src/components/Corporate";
import { corp, corpPost } from "../src/services/api";
import { useApp } from "../src/state/Providers";
import type { Review } from "../src/types";
import { assertOnline } from "../src/utils/offline";
import { dateTime, label, money } from "../src/utils/journey";

type Decision = "APPROVE" | "REJECT";

// The request is read from the approver queue, so a request that is not (or no
// longer) assigned to this employee is never shown or actionable here.
export default function ReviewDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, online } = useApp();
  const client = useQueryClient();
  const q = useQuery({
    queryKey: ["reviews", session?.user.id],
    queryFn: ({ signal }) => corp<{ items: Review[] }>("approver-queue", "", signal),
    enabled: !!session,
  });
  const [remarks, setRemarks] = useState("");
  const [confirm, setConfirm] = useState<"" | Decision>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<"" | "APPROVED" | "REJECTED" | "FORWARDED">("");
  const submitting = useRef(false);
  const item = q.data?.items.find((r) => r.id === id);
  const r = item?.ride;
  async function decide(action: Decision) {
    if (!item || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      assertOnline(online);
      const result = await corpPost<{ status: string }>("approver-decision", { id: item.id, action, remarks: remarks.trim() });
      setDone(result.status === "PENDING" ? "FORWARDED" : result.status === "APPROVED" ? "APPROVED" : "REJECTED");
      await Promise.all([client.invalidateQueries({ queryKey: ["reviews"] }), client.invalidateQueries({ queryKey: ["home"] })]);
    } catch (e) {
      setError((e as Error).message);
      // A 409 means someone else decided first or the request changed; refresh the queue.
      if ((e as { status?: number }).status === 409 || (e as { status?: number }).status === 403) void q.refetch();
    } finally {
      setConfirm("");
      setBusy(false);
      submitting.current = false;
    }
  }
  if (done)
    return (
      <Screen title="Decision recorded">
        <Card tone={done === "REJECTED" ? colors.red : colors.emerald}>
          <Heading>{done === "APPROVED" ? "Request approved" : done === "REJECTED" ? "Request rejected" : "Approved at your step"}</Heading>
          <T muted>
            {done === "APPROVED"
              ? "This was the final approval. The traveller is notified and confirms the ride at a fresh price. It is not a booking until they do."
              : done === "REJECTED"
                ? "The traveller is notified with your reason."
                : "The request now moves to the next approver in your company's workflow."}
          </T>
        </Card>
        <Button title="Back to requests" onPress={() => router.replace("/reviews")} />
      </Screen>
    );
  return (
    <Screen title="Review request" subtitle={item ? `Submitted ${dateTime(item.submittedAt)}` : undefined} refresh={() => void q.refetch()} refreshing={q.isRefetching}>
      {q.isPending && <LoadingState />}
      <ErrorState error={q.error} retry={() => void q.refetch()} />
      {q.isSuccess && !item && (
        <>
          <EmptyState title="Not waiting for you" body="This request was already decided, moved to another approver, or is not assigned to you." icon="checkmark-done-outline" />
          <Button title="Requests to review" secondary onPress={() => router.replace("/reviews")} />
        </>
      )}
      {item && (
        <>
          <Card>
            <Row>
              <T weight="700" size={17}>{item.employee.name}</T>
              <ApprovalBadge status={item.status} />
            </Row>
            <T muted size={13}>{[item.employee.code, item.employee.department].filter(Boolean).join(" · ")}</T>
            {r ? (
              <>
                <Heading>{r.route.pickupCity}{r.route.dropCity ? ` to ${r.route.dropCity.replaceAll("|", ", ")}` : ""}</Heading>
                <KeyValue k="Pickup" v={dateTime(r.pickupDateTime)} />
                {!!r.route.packageName && <KeyValue k="Package" v={r.route.packageName} />}
                {r.tripType === "ROUNDTRIP" && <KeyValue k="Duration" v={`${r.days} day(s)`} />}
                <KeyValue k="Vehicle" v={`${r.vehicle.make} ${r.vehicle.model} · ${label(r.vehicle.category)}`} />
                <KeyValue k="Vendor" v={r.vendorName} />
                <KeyValue k="From" v={r.pickupAddress} />
                <KeyValue k="To" v={r.dropAddress} />
                {!!r.note && <KeyValue k="Traveller's note" v={r.note} />}
              </>
            ) : (
              <T muted>Ride details are not available for this request.</T>
            )}
          </Card>
          {r && (
            <Card>
              <Heading>Quoted fare</Heading>
              <KeyValue k="Base fare" v={money(r.fare.vendorFare)} />
              <KeyValue k="Platform fee" v={money(r.fare.platformFee)} />
              <KeyValue k="GST" v={money(r.fare.taxAmount)} />
              <KeyValue k="Requested amount" v={<T size={18} weight="800" color={colors.brand}>{money(item.amount)}</T>} />
              <T muted size={12}>If approved, the traveller books at a fresh price that cannot exceed this amount.</T>
            </Card>
          )}
          {!!r?.policyReasons.length && (
            <Card tone={colors.amber}>
              <Heading>Why approval is needed</Heading>
              <PolicyReasons policy={{ decision: "APPROVAL_REQUIRED", reasons: r.policyReasons }} />
            </Card>
          )}
          <Card>
            <Heading>Approval steps</Heading>
            <StatusTimeline items={item.steps.map((s) => ({ title: `Level ${s.level} · ${s.approver ?? label(s.stage)}: ${label(s.status)}`, at: s.actedAt, done: s.status !== "PENDING", note: s.remarks }))} />
          </Card>
          <Card>
            <Heading>Your decision</Heading>
            <Field label="Remarks (required to reject)" value={remarks} onChangeText={setRemarks} multiline placeholder="Reason or instructions for the traveller" />
            <Message text={error} />
            <Button title="Approve" icon="checkmark-circle-outline" disabled={!online || busy} busy={busy && confirm === "APPROVE"} onPress={() => setConfirm("APPROVE")} />
            <Button title="Reject" icon="close-circle-outline" danger disabled={!online || busy || !remarks.trim()} busy={busy && confirm === "REJECT"} onPress={() => setConfirm("REJECT")} />
            {!online && <T muted size={13}>Reconnect to decide. Nothing is sent while offline.</T>}
          </Card>
        </>
      )}
      <ConfirmationSheet
        visible={!!confirm}
        busy={busy}
        title={confirm === "APPROVE" ? "Approve this request?" : "Reject this request?"}
        body={confirm === "APPROVE"
          ? `Approve ${item?.employee.name ?? "this"}'s ride for up to ${money(item?.amount)}. If more approvers follow you, it moves to them next.`
          : "The traveller will be told the request was rejected, with your remarks."}
        confirm={confirm === "APPROVE" ? "Approve" : "Reject"}
        onConfirm={() => void decide(confirm as Decision)}
        onCancel={() => setConfirm("")}
      />
    </Screen>
  );
}

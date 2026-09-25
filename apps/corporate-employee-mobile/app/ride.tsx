import { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import { Button, Card, ConfirmationSheet, EmptyState, Field, Heading, KeyValue, Message, Screen, T, colors } from "../src/components/ui";
import { FareBreakdown, PolicyBadge, PolicyReasons, decisionColor } from "../src/components/Corporate";
import { corp, corpPost } from "../src/services/api";
import { uncertain } from "../src/services/errors";
import { useApp } from "../src/state/Providers";
import type { Config, Profile, Quote } from "../src/types";
import { assertOnline } from "../src/utils/offline";
import { dateTime, label, pickupISO, quoteExpired, quoteInput, rideInput } from "../src/utils/journey";

export default function Ride() {
  const { journey, setJourney, online, session } = useApp();
  const client = useQueryClient();
  const profile = useQuery({ queryKey: ["profile", session?.user.id], queryFn: ({ signal }) => corp<Profile>("profile", "", signal), enabled: !!session });
  const config = useQuery({ queryKey: ["config", session?.user.id], queryFn: ({ signal }) => corp<Config>("config", "", signal), enabled: !!session });
  const [pickupAddress, setPickup] = useState("");
  const [dropAddress, setDrop] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"" | "quote" | "submit">("");
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [interrupted, setInterrupted] = useState(false);
  const [now, setNow] = useState(Date.now());
  const submitting = useRef(false);
  const quote = journey?.quote;
  useEffect(() => {
    if (profile.data?.defaultPickupAddress && !pickupAddress) setPickup(profile.data.defaultPickupAddress);
  }, [profile.data?.defaultPickupAddress]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (journey && !journey.quote && online) void refreshQuote();
  }, [journey?.listing.id]);
  if (!journey)
    return (
      <Screen title="Choose a ride">
        <EmptyState title="No ride selected" body="Search the marketplace and choose a vehicle to continue." icon="search-outline" />
        <Button title="Book a ride" onPress={() => router.replace("/book")} />
      </Screen>
    );
  const { search, listing } = journey;
  const expired = quote ? quoteExpired(quote, now) : true;
  const decision = quote?.policy.decision;
  async function refreshQuote() {
    if (!journey) return;
    setBusy("quote");
    setError("");
    setInterrupted(false);
    try {
      assertOnline(online);
      const q = await corpPost<Quote>("quote", quoteInput(journey.search, journey.listing, Crypto.randomUUID()));
      setJourney({ ...journey, quote: q });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function submit() {
    if (submitting.current || !quote || !journey) return;
    submitting.current = true;
    setBusy("submit");
    setError("");
    try {
      assertOnline(online);
      const input = rideInput(search, listing, quote, pickupAddress, dropAddress);
      if (decision === "ALLOWED") {
        const booking = await corpPost<{ id: string }>("book", input);
        await Promise.all([client.invalidateQueries({ queryKey: ["trips"] }), client.invalidateQueries({ queryKey: ["home"] })]);
        setJourney(null);
        router.replace({ pathname: "/trip", params: { id: booking.id, confirmed: "1" } });
      } else if (decision === "APPROVAL_REQUIRED") {
        const request = await corpPost<{ id: string }>("approvals", { ...input, note: note.trim() });
        await Promise.all([client.invalidateQueries({ queryKey: ["approvals"] }), client.invalidateQueries({ queryKey: ["home"] })]);
        setJourney(null);
        router.replace({ pathname: "/approval", params: { id: request.id, submitted: "1" } });
      }
    } catch (e) {
      setError((e as Error).message);
      // The server may have committed. Resubmitting the same quote is idempotent.
      if (uncertain(e)) setInterrupted(true);
    } finally {
      setConfirming(false);
      setBusy("");
      submitting.current = false;
    }
  }
  let ready = false;
  try {
    ready = !!quote && !expired && !!pickupISO(search) && !!pickupAddress.trim() && !!dropAddress.trim();
  } catch {
    ready = false;
  }
  const payment = config.data?.paymentMethod === "CORPORATE_CREDIT" ? "Billed to your company's corporate credit account." : "Pay the driver at pickup (cash). Your company has no corporate credit account configured.";
  return (
    <Screen title={`${listing.vehicle.make} ${listing.vehicle.model}`} subtitle={`${label(listing.vehicle.category)} · ${listing.vendor?.companyName || "Vendor"}`}>
      <Card>
        <KeyValue k="Route" v={`${search.pickupCity}${search.dropCity ? ` to ${search.dropCity.replaceAll("|", ", ")}` : ""}`} />
        {!!listing.pricing.packageName && <KeyValue k="Package" v={listing.pricing.packageName} />}
        <KeyValue k="Pickup" v={dateTime(quote?.fare.tripDateTime || pickupISO(search))} />
        {search.tripType === "ROUNDTRIP" && <KeyValue k="Duration" v={`${search.days} day(s)`} />}
        <KeyValue k="Vehicle" v={`${listing.vehicle.seatingCapacity} seats · ${label(listing.vehicle.fuelType)} · ${label(listing.vehicle.transmission)}`} />
        {listing.driver && <KeyValue k="Driver" v={`${listing.driver.name}${listing.driver.verified ? " (verified)" : ""}`} />}
        {listing.pricing.includedKm != null && <KeyValue k="Included" v={`${listing.pricing.includedKm} km${listing.pricing.includedHours ? ` / ${listing.pricing.includedHours} hr` : ""}`} />}
      </Card>
      {!quote && busy === "quote" && <Card><T muted>Getting a fresh price and policy check...</T></Card>}
      {quote && (
        <Card tone={decisionColor(quote.policy.decision)}>
          <Heading>Company policy</Heading>
          <PolicyBadge decision={quote.policy.decision} />
          <PolicyReasons policy={quote.policy} />
          {quote.policy.decision === "ALLOWED" && <T muted size={13}>This ride is within your company travel policy.</T>}
        </Card>
      )}
      {quote && <FareBreakdown fare={quote.fare} />}
      {quote && <T muted size={12}>{expired ? "This quote has expired." : `Quote valid until ${new Date(quote.fare.quoteExpiry || "").toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })} IST.`}</T>}
      {(expired || !quote) && busy !== "quote" && <Button title={quote ? "Refresh price" : "Get price"} icon="refresh" disabled={!online} onPress={() => void refreshQuote()} />}
      {decision === "NOT_ALLOWED" && (
        <Card tone={colors.red}>
          <Heading>This ride is not allowed</Heading>
          <T muted>Your company travel policy does not permit this ride, and it cannot be requested for approval. Choose different trip details.</T>
          <Button title="Change search" secondary onPress={() => router.replace("/book")} />
        </Card>
      )}
      {quote && decision !== "NOT_ALLOWED" && (
        <Card>
          <Heading>Trip details</Heading>
          <Field label="Pickup address" value={pickupAddress} onChangeText={setPickup} placeholder="Building, street, landmark" />
          <Field label="Drop address" value={dropAddress} onChangeText={setDrop} placeholder="Building, street, landmark" />
          {decision === "APPROVAL_REQUIRED" && <Field label="Note for your approver (optional)" value={note} onChangeText={setNote} multiline />}
          <KeyValue k="Payment" v={config.data ? (config.data.paymentMethod === "CORPORATE_CREDIT" ? "Corporate credit" : "Cash at pickup") : "Checking..."} />
          <T muted size={12}>{config.data ? payment : ""}</T>
          <Message text={error} />
          {interrupted && <Message tone={colors.amber} text="The response was interrupted. Your request may already be saved. Check again safely with the same quote before starting a new one." />}
          <Button
            title={decision === "ALLOWED" ? "Confirm ride" : "Submit for approval"}
            icon={decision === "ALLOWED" ? "checkmark-circle-outline" : "send-outline"}
            disabled={!online || !ready || !config.data}
            busy={busy === "submit"}
            onPress={() => (interrupted ? void submit() : setConfirming(true))}
          />
          {!online && <T muted size={13}>Reconnect to continue. Nothing is submitted while offline.</T>}
        </Card>
      )}
      {!quote && !!error && <Message text={error} />}
      <ConfirmationSheet
        visible={confirming}
        busy={busy === "submit"}
        title={decision === "ALLOWED" ? "Confirm this ride?" : "Send for approval?"}
        body={decision === "ALLOWED"
          ? `Book ${listing.vehicle.make} ${listing.vehicle.model} for ${dateTime(quote?.fare.tripDateTime)}. ${payment}`
          : "Your approver will review this ride. After approval you confirm it at a fresh price, which must not exceed the approved amount."}
        confirm={decision === "ALLOWED" ? "Book ride" : "Submit request"}
        onConfirm={() => void submit()}
        onCancel={() => setConfirming(false)}
      />
    </Screen>
  );
}

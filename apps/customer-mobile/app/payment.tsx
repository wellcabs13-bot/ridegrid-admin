import { useEffect, useState, useRef } from "react";
import { Linking, Text, Switch, View } from "react-native";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import { useJourney } from "../src/state/Journey";
import { useApp } from "../src/state/Providers";
import { api, post, baseURL } from "../src/services/api";
import { bookingInput, quoteExpired, quoteInput } from "../src/utils/journey";
import type { Config, Profile, Quote } from "../src/types";
import {
  Screen,
  Card,
  Button,
  ErrorText,
  SignedIn,
  Empty,
  styles,
} from "../src/components/ui";
import { Fare } from "../src/components/Fare";
import { liveActionAllowed } from "../src/utils/offline";
export default function Payment() {
  const { journey, setJourney } = useJourney();
  const { session, online } = useApp();
  const client = useQueryClient();
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [payingOnline, setPayingOnline] = useState(false);
  const [now, setNow] = useState(Date.now());
  const submitting = useRef(false);
  const [uncertain, setUncertain] = useState(false);
  const profile = useQuery({
    queryKey: ["profile", session?.user.id],
    queryFn: () => api<Profile>("/api/mobile/profile"),
    enabled: !!session,
  });
  const config = useQuery({
    queryKey: ["config"],
    queryFn: () => api<Config>("/api/mobile/config", {}, false),
  });
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const expired = journey?.quote ? quoteExpired(journey.quote, now) : true;
  async function refresh() {
    if (!journey) return;
    setBusy(true);
    setError("");
    try {
      const quote = await post<Quote>(
        "/api/pricing/quote",
        quoteInput(journey.search, journey.listing, Crypto.randomUUID()),
      );
      setJourney({ ...journey, quote });
      setAccepted(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function confirm(method: "CASH" | "UPI" = "CASH") {
    if (
      submitting.current ||
      !journey?.quote ||
      !profile.data ||
      !accepted ||
      !liveActionAllowed(online, !!session)
    )
      return;
    submitting.current = true;
    method === "UPI" ? setPayingOnline(true) : setBusy(true);
    setError("");
    try {
      const p = profile.data;
      const input = bookingInput(
        journey.search,
        journey.listing,
        journey.quote,
        {
          firstName: p.firstName,
          lastName: p.lastName,
          email: p.user.email,
          mobile: p.user.mobile || "",
        },
        journey.pickupAddress || "",
        journey.dropAddress || "",
        method,
      );
      const booking = await post<{
        id: string;
        bookingNumber: string;
        payuCheckoutUrl?: string;
      }>("/api/marketplace/cash-booking", input);

      if (method === "UPI") {
        if (!booking.payuCheckoutUrl) throw new Error("Unable to start online payment. Please try again.");
        setJourney(null);
        const result = await WebBrowser.openAuthSessionAsync(
          `${baseURL}${booking.payuCheckoutUrl}`,
          "ridegrid://payment-return",
        );
        await client.invalidateQueries({ queryKey: ["bookings"] });
        const returnedId =
          result.type === "success" && result.url
            ? decodeURIComponent(result.url.match(/bookingId=([^&]+)/)?.[1] || "")
            : "";
        router.replace({
          pathname: "/payment-return",
          params: { bookingId: returnedId || booking.id, bookingNumber: booking.bookingNumber },
        });
        return;
      }

      await client.invalidateQueries({ queryKey: ["bookings"] });
      setJourney(null);
      router.replace({
        pathname: "/bookings/[id]",
        params: { id: booking.id, confirmed: "1" },
      });
    } catch (e) {
      setError((e as Error).message);
      const status = (e as { status?: number }).status;
      if (status === 0 || (status !== undefined && status >= 500))
        setUncertain(true);
    } finally {
      setBusy(false);
      setPayingOnline(false);
      submitting.current = false;
    }
  }
  return (
    <Screen
      title="Review & confirm"
      subtitle="Review your journey and confirm your booking."
    >
      <SignedIn>
        {!journey?.quote ? (
          <Empty
            title="A fresh quote is needed"
            body="Return to your selected ride to continue."
          />
        ) : (
          <>
            <Card>
              <Text style={styles.heading}>
                {journey.listing.vehicle.make} {journey.listing.vehicle.model}
              </Text>
              <Text style={styles.body}>{journey.pickupAddress}</Text>
              <Text style={styles.small}>to</Text>
              <Text style={styles.body}>{journey.dropAddress}</Text>
              <Text style={styles.small}>
                {journey.search.date} / {journey.search.time} IST /{" "}
                {journey.search.days} day(s)
              </Text>
            </Card>
            <Fare value={journey.quote.snapshot} />
            <Card>
              <Text style={styles.heading}>Payment method</Text>
              <Text style={styles.subtitle}>
                Pay online with PayU, or choose cash on pickup.
              </Text>
              <Text style={styles.small}>
                Quote valid until{" "}
                {new Date(
                  journey.quote.snapshot.quoteExpiry,
                ).toLocaleTimeString()}
              </Text>
              {expired && (
                <>
                  <ErrorText error="Your quote expired. Get a fresh price and review it before confirming." />
                  <Button
                    title="Refresh price"
                    onPress={() => void refresh()}
                    disabled={!online || uncertain}
                    busy={busy}
                  />
                </>
              )}
              <View style={styles.row}>
                <Text style={[styles.body, { flex: 1 }]}>
                  I accept the booking terms and have checked my journey
                  details.
                </Text>
                <Switch
                  accessibilityLabel="Accept booking terms"
                  value={accepted}
                  onValueChange={setAccepted}
                />
              </View>
              <Button
                title="Read booking terms"
                secondary
                disabled={!config.data}
                onPress={() =>
                  void Linking.openURL(`${baseURL}${config.data?.termsPath}`)
                }
              />
              <ErrorText error={error} />
              {uncertain && (
                <>
                  <Text style={styles.small}>
                    The response was interrupted. Check My Trips before trying
                    again. Do not start another booking until you know the
                    result.
                  </Text>
                  <Button
                    title="Check My Trips"
                    onPress={() => router.push("/(tabs)/trips")}
                  />
                </>
              )}
              <Button
                title="Pay Online with PayU"
                busy={payingOnline}
                disabled={
                  !online ||
                  expired ||
                  uncertain ||
                  !accepted ||
                  !profile.data ||
                  busy ||
                  !config.data?.paymentMethods.includes("ONLINE")
                }
                onPress={() => void confirm("UPI")}
              />
              <Button
                title="Confirm cash booking"
                secondary
                busy={busy}
                disabled={
                  !online ||
                  expired ||
                  uncertain ||
                  !accepted ||
                  !profile.data ||
                  payingOnline ||
                  !config.data?.paymentMethods.includes("CASH")
                }
                onPress={() => void confirm("CASH")}
              />
              <Button
                title="Return to search"
                secondary
                onPress={() => router.replace("/(tabs)")}
              />
            </Card>
          </>
        )}
      </SignedIn>
    </Screen>
  );
}

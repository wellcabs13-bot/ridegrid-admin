import { VehicleIdentity } from "../src/components/Premium";
import { useState, useEffect } from "react";
import { Text } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import { useJourney } from "../src/state/Journey";
import { useApp } from "../src/state/Providers";
import { api, post } from "../src/services/api";
import type { Profile, Quote } from "../src/types";
import { quoteInput } from "../src/utils/journey";
import {
  Screen,
  Card,
  Button,
  ErrorText,
  SignedIn,
  Empty,
  styles,
} from "../src/components/ui";
import { AddressField } from "../src/components/AddressField";
export default function Checkout() {
  const { journey, setJourney } = useJourney();
  const { session, online } = useApp();
  const [pickup, setPickup] = useState(journey?.pickupAddress || "");
  const [drop, setDrop] = useState(journey?.dropAddress || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const profile = useQuery({
    queryKey: ["profile", session?.user.id],
    queryFn: () => api<Profile>("/api/mobile/profile"),
    enabled: !!session,
  });
  async function next() {
    if (!journey) return;
    setBusy(true);
    setError("");
    try {
      if (!pickup.trim() || !drop.trim())
        throw new Error("Enter exact pickup and drop addresses.");
      if (!profile.data?.user.mobile)
        throw new Error(
          "A mobile number is required. Please contact support to update your account.",
        );
      const quote = await post<Quote>(
        "/api/pricing/quote",
        quoteInput(journey.search, journey.listing, Crypto.randomUUID()),
      );
      if (!quote.id)
        throw new Error("Unable to reserve a quote. Please retry.");
      setJourney({
        ...journey,
        quote,
        pickupAddress: pickup.trim(),
        dropAddress: drop.trim(),
      });
      router.push("/payment");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen
      title="Booking summary"
      subtitle="Add exact addresses so your driver knows where to meet you."
    >
      <SignedIn>
        {!journey ? (
          <Empty
            title="Choose a ride first"
            body="Return home and search for your journey."
          />
        ) : (
          <>
            <Card>
              <VehicleIdentity listing={journey.listing} />
              <Text style={styles.heading}>
                {journey.search.pickupCity} →{" "}
                {journey.search.dropCity.replaceAll("|", " · ") ||
                  journey.search.pickupCity}
              </Text>
              <Text style={styles.small}>
                {journey.search.serviceType === "LOCAL"
                  ? "Local"
                  : journey.search.tripType === "ROUNDTRIP"
                    ? "Roundtrip"
                    : "One-way"}{" "}
                · {journey.search.days} day(s)
              </Text>
            </Card>
            <Card>
              <Text style={styles.heading}>Customer</Text>
              <Text style={styles.body}>
                {profile.data?.firstName} {profile.data?.lastName}
              </Text>
              <Text style={styles.small}>{profile.data?.user.email}</Text>
              <Text style={styles.small}>{profile.data?.user.mobile}</Text>
              <ErrorText error={profile.error} />
              <Button
                title="Edit my name"
                secondary
                onPress={() => router.push("/profile")}
              />
            </Card>
            <Card>
              <AddressField
                label="Pickup address"
                value={pickup}
                onChange={setPickup}
                online={online}
              />
              <AddressField
                label="Drop address"
                value={drop}
                onChange={setDrop}
                online={online}
              />
            </Card>
            <Text style={styles.body}>
              {journey.search.date} / {journey.search.time} IST /{" "}
              {journey.search.days} day(s)
            </Text>
            <ErrorText error={error} />
            <Button
              title="Get final quote"
              onPress={() => void next()}
              busy={busy}
              disabled={!online || !profile.data}
            />
          </>
        )}
      </SignedIn>
    </Screen>
  );
}

import { Linking, Text, View } from "react-native";
import { formatDateTime } from "../utils/when";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { Card, Button, ErrorText, styles, theme } from "./ui";
import { Badge, RouteLine } from "./Premium";
import { api } from "../services/api";
import { useApp } from "../state/Providers";
import { bookingTone, label } from "../utils/journey";
import type { Booking } from "../types";
export function TripStatus({ booking: b }: { booking: Booking }) {
  const { session, online } = useApp();
  const client = useQueryClient();
  const q = useQuery({
    queryKey: ["trip-status", session?.user.id, b.id],
    enabled: !!session,
    refetchInterval:
      online && !["TRIP_COMPLETED", "CANCELLED"].includes(b.status)
        ? 30000
        : false,
    queryFn: ({ signal }) =>
      api<{
        status: string;
        liveTracking: boolean;
        location: null | { latitude: number; longitude: number; accuracy: number | null; recordedAt: string };
        trip: null | {
          status: string;
          driverAssignedAt: string | null;
          driverAcceptedAt: string | null;
          arrivedPickupAt: string | null;
          tripStartedAt: string | null;
          tripCompletedAt: string | null;
        };
      }>(`/api/mobile/trip-status?id=${encodeURIComponent(b.id)}`, { signal }),
  });
  // The booking shown around this card (status, driver, contact) reloads as soon as the
  // lightweight status poll sees the Vendor or Driver App change it.
  useEffect(() => {
    if (q.data && q.data.status !== b.status) {
      void client.invalidateQueries({ queryKey: ["booking", session?.user.id, b.id] });
      void client.invalidateQueries({ queryKey: ["bookings"] });
    }
  }, [q.data?.status, b.status]);
  const milestones = q.data?.trip
    ? [
        ["Driver assigned", q.data.trip.driverAssignedAt],
        ["Driver accepted", q.data.trip.driverAcceptedAt],
        ["Arrived at pickup", q.data.trip.arrivedPickupAt],
        ["Trip started", q.data.trip.tripStartedAt],
        ["Trip completed", q.data.trip.tripCompletedAt],
      ]
    : [];
  return (
    <Card>
      <View style={styles.row}>
        <Text style={[styles.heading, { fontSize: 16 }]}>Trip status</Text>
        <Badge
          text={label(q.data?.trip?.status || q.data?.status || b.status)}
          tone={bookingTone(q.data?.status || b.status).tone}
          icon={bookingTone(q.data?.status || b.status).icon}
        />
      </View>
      <LinearGradient
        colors={[theme.field, theme.surface]}
        style={{ padding: 16, gap: 12, borderRadius: 14 }}
      >
        <Text style={[styles.small, { letterSpacing: 1.5, fontWeight: "700" }]}>
          ROUTE OVERVIEW
        </Text>
        <RouteLine from={b.pickupLocation} to={b.dropLocation} />
        <Text style={styles.small}>
          Route overview, not a live vehicle location.
        </Text>
      </LinearGradient>
      <Button
        secondary
        icon="map-outline"
        title="Open route in Maps"
        onPress={() =>
          void Linking.openURL(
            `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(b.pickupLocation)}&destination=${encodeURIComponent(b.dropLocation)}&travelmode=driving`,
          )
        }
      />
      {q.data?.liveTracking && q.data.location && <View style={{ gap: 8 }}>
        <Text style={styles.body}>Driver location received {new Date(q.data.location.recordedAt).toLocaleTimeString()}</Text>
        <Text style={styles.small}>Location may pause when the driver app is in the background.</Text>
        <Button secondary title="View driver location" onPress={() => void Linking.openURL(`https://www.google.com/maps?q=${q.data!.location!.latitude},${q.data!.location!.longitude}`)} />
      </View>}
      {milestones
        .filter(([, time]) => time)
        .map(([name, time]) => (
          <View key={name} style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <Ionicons name="checkmark-circle" size={20} color={theme.success} />
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={[styles.body, { fontWeight: "600" }]}>{name}</Text>
              <Text style={styles.small}>
                {formatDateTime(time!)}{" "}
                IST
              </Text>
            </View>
          </View>
        ))}
      <ErrorText error={q.error} />
      {q.isError && (
        <Button
          secondary
          title="Refresh trip status"
          onPress={() => void q.refetch()}
        />
      )}
    </Card>
  );
}

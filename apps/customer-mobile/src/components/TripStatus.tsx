import { Linking, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { Card, Button, ErrorText, styles, theme } from "./ui";
import { Badge } from "./Premium";
import { api } from "../services/api";
import { useApp } from "../state/Providers";
import { label } from "../utils/journey";
import type { Booking } from "../types";
export function TripStatus({ booking: b }: { booking: Booking }) {
  const { session, online } = useApp();
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
      <Text style={styles.heading}>Trip status</Text>
      <Badge
        text={label(q.data?.trip?.status || q.data?.status || b.status)}
        tone="green"
      />
      <LinearGradient
        colors={[theme.surface, theme.paper]}
        style={{ padding: 20, gap: 10, borderRadius: 14 }}
      >
        <Text style={[styles.small, { letterSpacing: 1.5 }]}>
          ROUTE OVERVIEW
        </Text>
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <Ionicons name="radio-button-on" color={theme.brand} size={22} />
          <Text style={[styles.body, { flex: 1 }]}>{b.pickupLocation}</Text>
        </View>
        <View
          style={{
            borderLeftColor: theme.brand,
            borderLeftWidth: 2,
            borderStyle: "dashed",
            height: 38,
            marginLeft: 10,
          }}
        />
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <Ionicons name="location" color={theme.gold} size={22} />
          <Text style={[styles.body, { flex: 1 }]}>{b.dropLocation}</Text>
        </View>
        <Text style={styles.small}>
          Route overview, not a live vehicle location.
        </Text>
      </LinearGradient>
      <Button
        secondary
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
          <View key={name} style={{ gap: 3 }}>
            <Text style={styles.body}>✓ {name}</Text>
            <Text style={styles.small}>
              {new Date(time!).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
              })}{" "}
              IST
            </Text>
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

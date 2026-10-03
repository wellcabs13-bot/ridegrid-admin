import { Linking } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, ErrorState, Heading, KeyValue, LoadingState, Message, Screen, T, colors } from "../src/components/ui";
import { ApprovalBadge, FareBreakdown, StatusBadge, StatusTimeline } from "../src/components/Corporate";
import { corp } from "../src/services/api";
import { useApp } from "../src/state/Providers";
import type { Trip, TripStatus } from "../src/types";
import { dateTime, label, money, rebookParams, serviceLabel } from "../src/utils/journey";

const LIVE = ["DRIVER_ASSIGNED", "TRIP_STARTED"];
export default function TripDetail() {
  const { id, confirmed } = useLocalSearchParams<{ id: string; confirmed?: string }>();
  const { session } = useApp();
  const q = useQuery({ queryKey: ["trips", session?.user.id, "detail", id], queryFn: ({ signal }) => corp<Trip>("trips", `?id=${encodeURIComponent(id)}`, signal), enabled: !!session && !!id });
  const t = q.data;
  const live = !!t && LIVE.includes(t.status);
  // Live position only when the Driver App has shared a fresh, attested location.
  const status = useQuery({
    queryKey: ["trip-status", session?.user.id, id],
    queryFn: ({ signal }) => corp<TripStatus>("trip-status", `?id=${encodeURIComponent(id)}`, signal),
    enabled: live,
    refetchInterval: live ? 20000 : false,
  });
  const loc = status.data?.location;
  return (
    <Screen title={t?.bookingNumber || "Trip"} subtitle={t ? `${serviceLabel(t.service)} · ${dateTime(t.pickupDateTime)}` : undefined} refresh={() => void q.refetch()} refreshing={q.isRefetching}>
      {confirmed && <Message tone={colors.emerald} text="Your ride is booked. Your company, the vendor and the assigned driver see this same booking." />}
      {q.isPending && <LoadingState />}
      <ErrorState error={q.error} retry={() => void q.refetch()} />
      {t && (
        <>
          <Card>
            <StatusBadge status={t.status} />
            <Heading>{t.pickupLocation}</Heading>
            <T muted>to {t.dropLocation}</T>
            <KeyValue k="Pickup" v={dateTime(t.pickupDateTime)} />
            {t.tripType === "ROUNDTRIP" && <KeyValue k="Duration" v={`${t.tripDays} day(s)`} />}
            {!!t.packageName && <KeyValue k="Package" v={t.packageName} />}
            <KeyValue k="Vehicle" v={`${t.vehicle.make} ${t.vehicle.model}`} />
            <KeyValue k="Registration" v={t.vehicle.registrationNumber} />
            <KeyValue k="Category" v={label(t.vehicle.category)} />
            <KeyValue k="Vendor" v={t.vendor.companyName} />
            <KeyValue k="Driver" v={t.driver?.name || "Being assigned"} />
            {t.payment && <KeyValue k="Payment" v={`${t.payment.method === "CORPORATE_CREDIT" ? "Corporate credit" : label(t.payment.method)} · ${label(t.payment.status)}`} />}
            {t.approval && <KeyValue k="Approval" v={<ApprovalBadge status={t.approval.status === "APPROVED" ? "BOOKED" : t.approval.status} />} />}
          </Card>
          {t.driver?.mobile && <Button title={`Call ${t.driver.name}`} icon="call-outline" onPress={() => void Linking.openURL(`tel:${t.driver!.mobile}`)} />}
          {live && (
            <Card tone={loc ? colors.emerald : undefined}>
              <Heading>Live location</Heading>
              {loc ? (
                <>
                  <T>Updated {dateTime(loc.recordedAt)}{loc.accuracy ? ` · within ${Math.round(loc.accuracy)} m` : ""}</T>
                  <Button title="Open in maps" secondary icon="map-outline" onPress={() => void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`)} />
                </>
              ) : (
                <T muted>Live location appears when your driver shares it from the RideGrid Driver App.</T>
              )}
            </Card>
          )}
          {t.fare ? <FareBreakdown fare={t.fare} /> : <Card><KeyValue k="Fare" v={money(t.finalFare)} /></Card>}
          {!!t.timeline?.length && (
            <Card>
              <Heading>Status timeline</Heading>
              <StatusTimeline items={t.timeline.map((h) => ({ title: label(h.currentStatus), at: h.changedAt, done: true, note: h.remarks }))} />
            </Card>
          )}
          <Button title="Get help with this trip" secondary icon="help-buoy-outline" onPress={() => router.push({ pathname: "/support", params: { booking: t.bookingNumber } })} />
          {t.rebook && (
            <Button title="Book this route again" secondary icon="repeat-outline" onPress={() => router.push({ pathname: "/book", params: rebookParams(t.rebook!) })} />
          )}
        </>
      )}
    </Screen>
  );
}

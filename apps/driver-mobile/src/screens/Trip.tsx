import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Badge, BottomCTA, Card, colors, CustomerCard, dateTime, ListRow, Label, Notice, RecordBadge, RouteBlock, Screen, SectionTitle, StateView, StatTiles, StatusBadge, VehicleRow } from "../components/ui";
import { useDriver } from "../services/driver";
import { post } from "../services/api";
import { useApp } from "../state/Providers";
import { useTracking } from "../state/Tracking";
import { assertOnline } from "../utils/offline";
import { activeLocation, driverAction, duration, navigationUrl, relative, routeUrl, tripPhase, type DriverAction } from "../utils/trips";
import { istParts } from "../utils/when";
import { ConfirmSheet, LocationCard, open, telHref } from "./common";
import type { Booking } from "../types";

// Sends one lifecycle transition. The server validates it against the same rules
// (driverAction); the screen only changes after RideGrid accepts it.
function useTransition(id: string, refetch: () => void, after?: (action: DriverAction) => void) {
  const { online } = useApp(), client = useQueryClient(), tracking = useTracking();
  const [action, setAction] = useState<DriverAction | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  // A second tap before re-render must not send the same transition twice.
  const sending = React.useRef(false);
  async function confirm() {
    if (sending.current || !action) return;
    sending.current = true;
    setBusy(true); setError("");
    const sent = action;
    try {
      assertOnline(online);
      await post("/api/mobile/driver/trips", { bookingId: id, action: sent });
      if (sent === "COMPLETE") tracking.stop();
      setAction(null);
      await client.invalidateQueries({ queryKey: ["driver"] });
      after?.(sent);
    } catch (e) {
      setAction(null);
      setError(e instanceof Error ? e.message : "Update failed. Refresh before retrying.");
      refetch();
    } finally { setBusy(false); sending.current = false; }
  }
  return { action, setAction, busy, error, confirm, online };
}

const customerName = (b: Booking) => `${b.customer.firstName} ${b.customer.lastName}`.trim() || "Customer";
function Customer({ b, live }: { b: Booking; live: boolean }) {
  return (
    <CustomerCard
      name={customerName(b)}
      caption={live && !b.customerPhone ? "Phone not shared for this trip" : "Customer"}
      onCall={live && b.customerPhone ? () => void open(telHref(b.customerPhone!)) : undefined}
      onSupport={() => router.push({ pathname: "/support", params: { id: b.id } })}
    />
  );
}

// Secondary information shared by every phase: vehicle, service, timeline, help.
function TripMore({ b }: { b: Booking }) {
  const [openTimeline, setOpenTimeline] = useState(false);
  const events = ([["Driver assigned", b.trip?.driverAssignedAt], ["Arrived at pickup", b.trip?.arrivedPickupAt], ["Trip started", b.trip?.tripStartedAt], ["Trip completed", b.trip?.tripCompletedAt]] as const).filter(([, at]) => at);
  return (
    <>
      <SectionTitle title="Vehicle" />
      <Card><VehicleRow vehicle={b.vehicle} /></Card>
      <Card style={{ gap: 0, paddingVertical: 4 }}>
        <ListRow icon="pricetag-outline" title={(b.pricingPackage?.packageType || "Service not recorded").replaceAll("_", " ")} subtitle={b.tripType === "ROUNDTRIP" ? "Round trip" : "One way"} />
        <ListRow icon="business-outline" title={b.vendor.companyName} subtitle="Partner" />
        <ListRow icon="time-outline" title="Trip timeline" subtitle={`${events.length + (b.statusHistory?.length || 0)} updates`} onPress={() => setOpenTimeline((v) => !v)} />
        {openTimeline && (
          <View style={{ gap: 10, paddingVertical: 10 }}>
            {events.map(([label, at]) => (
              <View key={label} style={{ flexDirection: "row", gap: 10 }}>
                <Ionicons name="checkmark-circle" size={18} color={colors.green} />
                <View style={{ flex: 1 }}><Label bold>{label}</Label><Label small muted>{dateTime(at)}</Label></View>
              </View>
            ))}
            {b.statusHistory?.map((h) => (
              <View key={h.id} style={{ gap: 4 }}>
                <RecordBadge value={h.currentStatus} />
                <Label small muted>{h.remarks || "Status updated"} · {dateTime(h.changedAt)}</Label>
              </View>
            ))}
          </View>
        )}
        <ListRow icon="map-outline" title="Preview full route" onPress={() => void open(routeUrl(b.pickupLocation, b.dropLocation))} />
        <ListRow icon="headset-outline" title="Contact support" onPress={() => router.push({ pathname: "/support", params: { id: b.id } })} />
        <ListRow icon="shield-outline" title="SOS / Safety" tone="red" last onPress={() => router.push({ pathname: "/safety", params: { id: b.id } })} />
      </Card>
    </>
  );
}

function Header({ b }: { b: Booking }) {
  const when = istParts(b.pickupDateTime);
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <StatusBadge booking={b} />
        <Label small muted>Trip ID: {b.bookingNumber}</Label>
      </View>
      <Text style={{ fontSize: 20, fontWeight: "800", color: colors.text }}>{when ? `${when.date}, ${when.time}` : "Pickup time not recorded"}</Text>
    </View>
  );
}

function Hero({ icon, bg, fg, title, sub }: { icon: React.ComponentProps<typeof Ionicons>["name"]; bg: string; fg: string; title: string; sub: string }) {
  return (
    <View style={{ alignItems: "center", gap: 8, paddingVertical: 12 }}>
      <View style={{ width: 112, height: 112, borderRadius: 56, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={60} color={fg} />
      </View>
      <Text style={{ fontSize: 26, fontWeight: "900", color: colors.text, textAlign: "center" }}>{title}</Text>
      <Label muted center>{sub}</Label>
    </View>
  );
}

export function TripScreen() {
  const { id = "" } = useLocalSearchParams<{ id: string }>(), q = useDriver<Booking>("trips", `?id=${encodeURIComponent(id)}`, true);
  const t = useTransition(id, () => void q.refetch());
  const b = q.data, phase = b ? tripPhase(b) : null, allowed = b ? driverAction(b) : null;
  const titles = { scheduled: "Trip Details", upcoming: "Trip Details", arrived: "Arrived at Pickup", inProgress: "Trip in Progress", completed: "Trip Completed", cancelled: "Trip Details" } as const;
  // One primary action per phase. Upcoming opens the Go to Pickup screen (navigation
  // only — no server change); the others are server transitions.
  const footer = !b
    ? undefined
    : phase === "upcoming"
      ? <BottomCTA title="Go to Pickup" icon="navigate" onPress={() => router.push({ pathname: "/pickup", params: { id } })} />
      : phase === "arrived"
        ? <BottomCTA title="Start Trip" icon="play" variant="success" disabled={!t.online || allowed !== "START"} note={!t.online ? "Reconnect to start the trip." : undefined} onPress={() => t.setAction("START")} />
        : phase === "inProgress"
          ? <BottomCTA title="Complete Trip" icon="flag" disabled={!t.online || allowed !== "COMPLETE"} note={!t.online ? "Reconnect to complete the trip." : allowed !== "COMPLETE" ? "Waiting for the trip status to update. Pull to refresh." : undefined} onPress={() => t.setAction("COMPLETE")} />
          : phase === "completed"
            ? <BottomCTA title="Back to Home" icon="home" onPress={() => router.replace("/")} />
            : undefined;
  return (
    <Screen title={phase ? titles[phase] : "Trip Details"} refresh={() => void q.refetch()} refreshing={q.isRefetching} footer={footer}>
      <StateView loading={q.isPending} error={q.error} retry={() => void q.refetch()} />
      {!!t.error && <Notice tone="red" icon="alert-circle-outline" text={t.error} />}
      {b && phase === "completed" && (
        <>
          <Hero icon="checkmark" bg={colors.greenSoft} fg={colors.green} title="Great job!" sub="Trip completed successfully." />
          <Card>
            <RouteBlock pickup={b.pickupLocation} drop={b.dropLocation} />
            <StatTiles
              tinted
              items={[
                { label: "Completed", value: istParts(b.trip?.tripCompletedAt || "")?.time || "—", tone: "green" },
                { label: "Duration", value: duration(b.trip?.tripStartedAt, b.trip?.tripCompletedAt) || "—", tone: "blue" },
              ]}
            />
            <Label small muted>Trip ID {b.bookingNumber} · Earnings for this trip appear under Earnings once recorded.</Label>
          </Card>
          <TripMore b={b} />
        </>
      )}
      {b && phase === "arrived" && (
        <>
          <Hero icon="location" bg={colors.brandSoft} fg={colors.brand} title="You have arrived!" sub={b.pickupLocation} />
          <Card><Customer b={b} live /></Card>
          <Notice tone="red" icon="time-outline" text="Please wait for the customer to board the vehicle." />
          {activeLocation(b) && <LocationCard />}
          <Card><RouteBlock pickup={b.pickupLocation} drop={b.dropLocation} onOpenMap={() => void open(navigationUrl(b.dropLocation))} /></Card>
          <TripMore b={b} />
        </>
      )}
      {b && phase === "inProgress" && (
        <>
          <Card>
            <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
              <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: colors.green, marginTop: 5 }} />
              <View style={{ flex: 1 }}>
                <Label small muted>Heading to</Label>
                <Text style={{ fontSize: 20, fontWeight: "800", color: colors.text }}>{b.dropLocation}</Text>
              </View>
            </View>
            <StatTiles
              tinted
              items={[
                { label: "Started", value: istParts(b.trip?.tripStartedAt || "")?.time || "—", tone: "green" },
                { label: "On trip", value: duration(b.trip?.tripStartedAt, new Date().toISOString()) || "—", tone: "red" },
              ]}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => void open(navigationUrl(b.dropLocation))}
              style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.blueSoft, borderRadius: 14, padding: 14 }}
            >
              <Ionicons name="navigate" size={22} color={colors.blue} />
              <Text style={{ flex: 1, color: colors.blue, fontWeight: "800", fontSize: 16 }}>Navigate to destination</Text>
              <Ionicons name="open-outline" size={18} color={colors.blue} />
            </Pressable>
          </Card>
          <Card><Customer b={b} live /></Card>
          {activeLocation(b) && <LocationCard />}
          <Card><RouteBlock pickup={b.pickupLocation} drop={b.dropLocation} /></Card>
          <TripMore b={b} />
        </>
      )}
      {b && (phase === "upcoming" || phase === "scheduled" || phase === "cancelled") && (
        <>
          <Card>
            <Header b={b} />
            <RouteBlock pickup={b.pickupLocation} drop={b.dropLocation} onOpenMap={phase === "cancelled" ? undefined : () => void open(routeUrl(b.pickupLocation, b.dropLocation))} />
            {phase !== "cancelled" && <Label small muted>Pickup {relative(b.pickupDateTime)}</Label>}
          </Card>
          {phase === "scheduled" && <Notice tone="blue" text="This trip is scheduled. Trip actions unlock once dispatch confirms your assignment." />}
          {phase === "cancelled" && <Notice tone="red" icon="close-circle-outline" text="This trip was cancelled. No action is needed." />}
          <SectionTitle title="Customer" />
          <Card><Customer b={b} live={phase !== "cancelled"} /></Card>
          <TripMore b={b} />
        </>
      )}
      <ConfirmSheet action={t.action} busy={t.busy} close={() => { if (!t.busy) t.setAction(null); }} confirm={() => void t.confirm()} />
    </Screen>
  );
}

// Go to Pickup: hand-off to turn-by-turn navigation in Google Maps, then "I Have Arrived".
export function PickupScreen() {
  const { id = "" } = useLocalSearchParams<{ id: string }>(), q = useDriver<Booking>("trips", `?id=${encodeURIComponent(id)}`, true);
  const t = useTransition(id, () => void q.refetch(), () => router.replace({ pathname: "/trip", params: { id } }));
  const b = q.data, allowed = b ? driverAction(b) : null;
  // Once the trip has moved on (arrived elsewhere, cancelled…), the trip screen owns it.
  React.useEffect(() => {
    if (b && tripPhase(b) !== "upcoming") router.replace({ pathname: "/trip", params: { id } });
  }, [b, id]);
  const when = b ? istParts(b.pickupDateTime) : null;
  return (
    <Screen
      title="Go to Pickup"
      refresh={() => void q.refetch()}
      refreshing={q.isRefetching}
      footer={
        b ? (
          <BottomCTA
            title="I Have Arrived"
            icon="location"
            disabled={!t.online || allowed !== "ARRIVED"}
            note={!t.online ? "Reconnect to confirm arrival." : undefined}
            onPress={() => t.setAction("ARRIVED")}
          />
        ) : undefined
      }
    >
      <StateView loading={q.isPending} error={q.error} retry={() => void q.refetch()} />
      {!!t.error && <Notice tone="red" icon="alert-circle-outline" text={t.error} />}
      {b && (
        <>
          <View style={{ backgroundColor: colors.greenDark, borderRadius: 18, padding: 18, flexDirection: "row", gap: 14, alignItems: "center" }}>
            <Ionicons name="arrow-redo" size={40} color="#FFFFFF" />
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#FFFFFFCC", fontWeight: "700" }}>Go to Pickup</Text>
              <Text style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "800" }} numberOfLines={3}>{b.pickupLocation}</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start navigation in Google Maps"
            onPress={() => void open(navigationUrl(b.pickupLocation))}
            style={{ height: 190, borderRadius: 18, backgroundColor: "#E8EEF3", alignItems: "center", justifyContent: "center", gap: 10, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}
          >
            <View style={{ position: "absolute", left: 40, top: 30, width: 200, height: 4, backgroundColor: "#D3DCE4", transform: [{ rotate: "-20deg" }] }} />
            <View style={{ position: "absolute", right: 30, bottom: 40, width: 220, height: 4, backgroundColor: "#D3DCE4", transform: [{ rotate: "15deg" }] }} />
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.blue, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="navigate" size={32} color="#FFFFFF" />
            </View>
            <Text style={{ fontSize: 17, fontWeight: "800", color: colors.text }}>Start navigation</Text>
            <Label small muted>Opens Google Maps with directions to pickup</Label>
          </Pressable>
          <Card>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
              <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>{when?.time || "—"}</Text>
              <Label muted>pickup · {relative(b.pickupDateTime)}</Label>
            </View>
            <Label muted>{b.pickupLocation}</Label>
            <Badge label={`Trip ID ${b.bookingNumber}`} tone="grey" />
          </Card>
          <Card><Customer b={b} live /></Card>
        </>
      )}
      <ConfirmSheet action={t.action} busy={t.busy} close={() => { if (!t.busy) t.setAction(null); }} confirm={() => void t.confirm()} />
    </Screen>
  );
}

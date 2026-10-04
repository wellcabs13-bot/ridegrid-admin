import React, { useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Badge, BottomCTA, Card, colors, CustomerCard, dateTime, FadeIn, gradients, IconTile, ListRow, Label, Notice, RecordBadge, RouteBlock, Screen, SectionTitle, shadow, StateView, StatCard, StatusBadge, useReducedMotion, VehicleRow, type Icon } from "../components/ui";
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
      <SectionTitle title="Vehicle" sub="Assigned for this trip" icon="car-sport-outline" tone="grey" />
      <Card><VehicleRow vehicle={b.vehicle} /></Card>
      <SectionTitle title="Trip details" sub={`Trip ID ${b.bookingNumber}`} icon="document-text-outline" tone="blue" />
      <Card style={{ gap: 0, paddingVertical: 6 }}>
        <ListRow icon="pricetag-outline" tone="blue" title={(b.pricingPackage?.packageType || "Service not recorded").replaceAll("_", " ")} subtitle={b.tripType === "ROUNDTRIP" ? "Round trip" : "One way"} />
        <ListRow icon="business-outline" title={b.vendor.companyName} subtitle="Partner" />
        <ListRow icon="time-outline" tone="amber" title="Trip timeline" subtitle={`${events.length + (b.statusHistory?.length || 0)} updates`} right={<Ionicons name={openTimeline ? "chevron-up" : "chevron-down"} size={18} color={colors.faint} />} onPress={() => setOpenTimeline((v) => !v)} last={!openTimeline} />
        {openTimeline && (
          <FadeIn style={{ gap: 12, paddingVertical: 12, paddingLeft: 8 }}>
            {events.map(([label, at]) => (
              <View key={label} style={{ flexDirection: "row", gap: 10 }}>
                <Ionicons name="checkmark-circle" size={20} color={colors.green} />
                <View style={{ flex: 1 }}><Label bold>{label}</Label><Label small muted>{dateTime(at)}</Label></View>
              </View>
            ))}
            {b.statusHistory?.map((h) => (
              <View key={h.id} style={{ gap: 4 }}>
                <RecordBadge value={h.currentStatus} />
                <Label small muted>{h.remarks || "Status updated"} · {dateTime(h.changedAt)}</Label>
              </View>
            ))}
          </FadeIn>
        )}
      </Card>
      <SectionTitle title="Help" sub="Support and safety for this trip" icon="headset-outline" tone="green" />
      <Card style={{ gap: 0, paddingVertical: 6 }}>
        <ListRow icon="map-outline" tone="blue" title="Preview full route" onPress={() => void open(routeUrl(b.pickupLocation, b.dropLocation))} />
        <ListRow icon="headset-outline" tone="green" title="Contact support" onPress={() => router.push({ pathname: "/support", params: { id: b.id } })} />
        <ListRow icon="shield-outline" title="SOS / Safety" tone="red" last onPress={() => router.push({ pathname: "/safety", params: { id: b.id } })} />
      </Card>
    </>
  );
}

function StatusHeader({ b }: { b: Booking }) {
  const when = istParts(b.pickupDateTime), phase = tripPhase(b);
  return (
    <LinearGradient colors={phase === "cancelled" ? ["#F4F5F8", "#FFFFFF"] : gradients.blush} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 20, padding: 16, gap: 10, borderWidth: 1, borderColor: colors.border }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <StatusBadge booking={b} large />
        <Text style={{ fontSize: 13, color: colors.muted, fontWeight: "700" }}>Trip ID {b.bookingNumber}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <IconTile icon="calendar" tone="red" size={46} solid />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 24, fontWeight: "900", color: colors.text, letterSpacing: -0.4 }}>{when?.time || "—"}</Text>
          <Text style={{ fontSize: 14, color: colors.muted, fontWeight: "600" }}>{when?.date || "Pickup time not recorded"}{phase !== "cancelled" && phase !== "completed" ? ` · pickup ${relative(b.pickupDateTime)}` : ""}</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

// Big circular icon that pops in; `confetti` adds a few lightweight static dots.
function Hero({ icon, bg, fg, title, sub, confetti = false }: { icon: Icon; bg: string; fg: string; title: string; sub: string; confetti?: boolean }) {
  const still = useReducedMotion();
  const v = React.useRef(new Animated.Value(still ? 1 : 0)).current;
  React.useEffect(() => {
    if (still) { v.setValue(1); return; }
    Animated.spring(v, { toValue: 1, useNativeDriver: true, speed: 9, bounciness: 12 }).start();
  }, [still, v]);
  const dots = ["#E53935", "#1F9D55", "#2F6FED", "#F5A623", "#E53935", "#1F9D55", "#F5A623", "#2F6FED"];
  return (
    <View style={{ alignItems: "center", gap: 8, paddingVertical: 10 }}>
      <View style={{ width: 220, height: 150, alignItems: "center", justifyContent: "center" }}>
        {confetti && dots.map((c, i) => {
          const angle = (i / dots.length) * Math.PI * 2;
          return (
            <Animated.View
              key={i}
              style={{ position: "absolute", width: i % 2 ? 8 : 10, height: i % 2 ? 8 : 4, borderRadius: 3, backgroundColor: c, opacity: v, transform: [{ translateX: Math.cos(angle) * 92 }, { translateY: Math.sin(angle) * 62 }, { rotate: `${i * 40}deg` }, { scale: v }] }}
            />
          );
        })}
        <Animated.View style={{ transform: [{ scale: v }] }}>
          <View style={{ width: 132, height: 132, borderRadius: 66, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: fg, alignItems: "center", justifyContent: "center", ...shadow }}>
              <Ionicons name={icon} size={54} color="#FFFFFF" />
            </View>
          </View>
        </Animated.View>
      </View>
      <Text style={{ fontSize: 28, fontWeight: "900", color: colors.text, textAlign: "center", letterSpacing: -0.5 }}>{title}</Text>
      <Label muted center>{sub}</Label>
    </View>
  );
}

// Live "on trip" clock, ticking each minute from the server's start time.
function useNow(every = 30000) {
  const [now, set] = useState(Date.now());
  React.useEffect(() => { const t = setInterval(() => set(Date.now()), every); return () => clearInterval(t); }, [every]);
  return now;
}
function LiveDot() {
  const still = useReducedMotion(), v = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    if (still) return;
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1500, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [still, v]);
  return (
    <View style={{ width: 16, height: 16, alignItems: "center", justifyContent: "center" }}>
      {!still && <Animated.View style={{ position: "absolute", width: 16, height: 16, borderRadius: 8, backgroundColor: "#FFFFFF", opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }] }} />}
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#FFFFFF" }} />
    </View>
  );
}

export function TripScreen() {
  const { id = "" } = useLocalSearchParams<{ id: string }>(), q = useDriver<Booking>("trips", `?id=${encodeURIComponent(id)}`, true);
  const t = useTransition(id, () => void q.refetch());
  const now = useNow();
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
          <Hero icon="checkmark" bg={colors.greenSoft} fg={colors.green} title="Trip Completed" sub="Great job! The trip was completed successfully." confetti />
          <FadeIn delay={150} style={{ gap: 14 }}>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <StatCard label="Completed at" value={istParts(b.trip?.tripCompletedAt || "")?.time || "—"} icon="flag" tone="green" />
              <StatCard label="Trip duration" value={duration(b.trip?.tripStartedAt, b.trip?.tripCompletedAt) || "—"} icon="timer" tone="blue" />
            </View>
            <Card>
              <RouteBlock pickup={b.pickupLocation} drop={b.dropLocation} />
              <Notice tone="green" icon="wallet-outline" text="Your allocation for this trip appears under Earnings once recorded." onPress={() => router.push("/earnings")} />
            </Card>
          </FadeIn>
          <TripMore b={b} />
        </>
      )}
      {b && phase === "arrived" && (
        <>
          <Hero icon="location" bg={colors.brandSoft} fg={colors.brand} title="You have arrived!" sub={b.pickupLocation} />
          <FadeIn delay={100} style={{ gap: 14 }}>
            <Card><Customer b={b} live /></Card>
            <Notice tone="blue" icon="time-outline" title="Waiting for customer" text="Please wait for the customer to board the vehicle, then start the trip." />
            {activeLocation(b) && <LocationCard />}
            <SectionTitle title="Route" sub="Pickup to drop" icon="git-commit-outline" tone="red" />
            <Card><RouteBlock pickup={b.pickupLocation} drop={b.dropLocation} onOpenMap={() => void open(navigationUrl(b.dropLocation))} /></Card>
          </FadeIn>
          <TripMore b={b} />
        </>
      )}
      {b && phase === "inProgress" && (
        <>
          <LinearGradient colors={gradients.nav} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 22, padding: 18, gap: 14, ...shadow }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <LiveDot />
              <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 14, letterSpacing: 0.6 }}>TRIP IN PROGRESS</Text>
            </View>
            <View>
              <Text style={{ color: "#FFFFFFCC", fontWeight: "700", fontSize: 14 }}>Heading to</Text>
              <Text style={{ color: "#FFFFFF", fontSize: 22, fontWeight: "900", letterSpacing: -0.3 }} numberOfLines={3}>{b.dropLocation}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => void open(navigationUrl(b.dropLocation))}
              style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFFFFF", borderRadius: 14, paddingHorizontal: 14, minHeight: 52 }, pressed && { opacity: 0.85 }]}
            >
              <Ionicons name="navigate" size={22} color={colors.green} />
              <Text style={{ flex: 1, color: colors.greenDark, fontWeight: "900", fontSize: 16 }}>Navigate to destination</Text>
              <Ionicons name="open-outline" size={18} color={colors.greenDark} />
            </Pressable>
          </LinearGradient>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <StatCard label="Started at" value={istParts(b.trip?.tripStartedAt || "")?.time || "—"} icon="play-circle" tone="green" />
            <StatCard label="On trip" value={duration(b.trip?.tripStartedAt, new Date(now).toISOString()) || "—"} icon="timer" tone="red" />
          </View>
          <SectionTitle title="Customer" icon="person-outline" tone="red" />
          <Card><Customer b={b} live /></Card>
          {activeLocation(b) && <LocationCard />}
          <SectionTitle title="Route" sub="Pickup to drop" icon="git-commit-outline" tone="red" />
          <Card><RouteBlock pickup={b.pickupLocation} drop={b.dropLocation} /></Card>
          <TripMore b={b} />
        </>
      )}
      {b && (phase === "upcoming" || phase === "scheduled" || phase === "cancelled") && (
        <>
          <FadeIn><StatusHeader b={b} /></FadeIn>
          {phase === "scheduled" && <Notice tone="blue" text="This trip is scheduled. Trip actions unlock once dispatch confirms your assignment." />}
          {phase === "cancelled" && <Notice tone="red" icon="close-circle-outline" text="This trip was cancelled. No action is needed." />}
          <SectionTitle title="Route" sub="Pickup to drop" icon="git-commit-outline" tone="red" />
          <Card><RouteBlock pickup={b.pickupLocation} drop={b.dropLocation} onOpenMap={phase === "cancelled" ? undefined : () => void open(routeUrl(b.pickupLocation, b.dropLocation))} /></Card>
          <SectionTitle title="Customer" icon="person-outline" tone="red" />
          <Card><Customer b={b} live={phase !== "cancelled"} /></Card>
          <TripMore b={b} />
        </>
      )}
      <ConfirmSheet action={t.action} busy={t.busy} close={() => { if (!t.busy) t.setAction(null); }} confirm={() => void t.confirm()} />
    </Screen>
  );
}

function MapControl({ icon, label, onPress }: { icon: Icon; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", ...shadow }, pressed && { transform: [{ scale: 0.92 }] }]}>
      <Ionicons name={icon} size={22} color={colors.text} />
    </Pressable>
  );
}

// Go to Pickup: hand-off to turn-by-turn navigation in Google Maps, then "I Have Arrived".
// No embedded map or distance feed exists, so none is drawn or estimated here.
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
          <BottomCTA title="I Have Arrived" icon="location" disabled={!t.online || allowed !== "ARRIVED"} note={!t.online ? "Reconnect to confirm arrival." : undefined} onPress={() => t.setAction("ARRIVED")} />
        ) : undefined
      }
    >
      <StateView loading={q.isPending} error={q.error} retry={() => void q.refetch()} />
      {!!t.error && <Notice tone="red" icon="alert-circle-outline" text={t.error} />}
      {b && (
        <>
          <FadeIn>
            <LinearGradient colors={gradients.nav} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 22, padding: 18, flexDirection: "row", gap: 14, alignItems: "center", ...shadow }}>
              <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: "#FFFFFF26", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="arrow-redo" size={32} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#FFFFFFCC", fontWeight: "800", fontSize: 13, letterSpacing: 0.6 }}>GO TO PICKUP</Text>
                <Text style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "900" }} numberOfLines={3}>{b.pickupLocation}</Text>
              </View>
            </LinearGradient>
          </FadeIn>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <StatCard label="Pickup time" value={when?.time || "—"} icon="time" tone="red" />
            <StatCard label="Time to pickup" value={relative(b.pickupDateTime) || "—"} icon="hourglass" tone="blue" />
          </View>
          <View style={{ height: 210, borderRadius: 22, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}>
            <LinearGradient colors={["#EAF1FE", "#F4F8FF", "#EEF7F2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Start navigation in Google Maps"
                onPress={() => void open(navigationUrl(b.pickupLocation))}
                style={({ pressed }) => [{ alignItems: "center", gap: 10 }, pressed && { opacity: 0.85 }]}
              >
                <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: colors.blue, alignItems: "center", justifyContent: "center", ...shadow }}>
                  <Ionicons name="navigate" size={36} color="#FFFFFF" />
                </View>
                <Text style={{ fontSize: 18, fontWeight: "900", color: colors.text }}>Start navigation</Text>
                <Label small muted>Opens Google Maps with live directions</Label>
              </Pressable>
              <View style={{ position: "absolute", right: 12, top: 12, gap: 10 }}>
                <MapControl icon="map-outline" label="Preview full route" onPress={() => void open(routeUrl(b.pickupLocation, b.dropLocation))} />
                <MapControl icon="headset-outline" label="Contact support" onPress={() => router.push({ pathname: "/support", params: { id: b.id } })} />
              </View>
            </LinearGradient>
          </View>
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <IconTile icon="location" tone="red" size={40} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: colors.muted, fontWeight: "800", letterSpacing: 0.6 }}>PICKUP</Text>
                <Label bold>{b.pickupLocation}</Label>
              </View>
            </View>
            <Badge label={`Trip ID ${b.bookingNumber}`} tone="grey" icon="pricetag-outline" />
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <Customer b={b} live />
          </Card>
        </>
      )}
      <ConfirmSheet action={t.action} busy={t.busy} close={() => { if (!t.busy) t.setAction(null); }} confirm={() => void t.confirm()} />
    </Screen>
  );
}

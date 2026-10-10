import React from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Avatar, Card, colors, FadeIn, gradients, Label, money, Notice, PrimaryCTA, Pulse, RouteBlock, Screen, SectionTitle, StateView, StatCard, StatusBadge, TripCard, VehicleRow } from "../components/ui";
import { useDriver } from "../services/driver";
import { useApp } from "../state/Providers";
import { istParts } from "../utils/when";
import { relative, tripPhase } from "../utils/trips";
import type { Booking, Home, Profile } from "../types";

type Earnings = { items: { id: string; pickupDateTime: string; driverPayout: string }[] };
function greeting(now = new Date()) {
  const h = new Date(now.getTime() + 19800000).getUTCHours();
  return h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening";
}

function HomeHeader({ first, unread }: { first: string; unread: number }) {
  return (
    <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16 }}>
      <Avatar name={first} size={52} ring />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, color: colors.muted, fontWeight: "700" }}>{greeting()}</Text>
        <Text style={{ fontSize: 23, fontWeight: "900", color: colors.text, letterSpacing: -0.4 }} numberOfLines={1}>{first}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={unread ? `Notifications, ${unread} unread` : "Notifications"}
        onPress={() => router.push("/notifications")}
        style={({ pressed }) => [{ width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, pressed && { transform: [{ scale: 0.94 }] }]}
      >
        <Ionicons name="notifications-outline" size={25} color={colors.text} />
        {unread > 0 && (
          <View style={{ position: "absolute", top: 4, right: 3, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", paddingHorizontal: 5, borderWidth: 2, borderColor: colors.surface }}>
            <Text style={{ color: "#FFFFFF", fontSize: 10.5, fontWeight: "900" }}>{unread > 99 ? "99+" : unread}</Text>
          </View>
        )}
      </Pressable>
    </LinearGradient>
  );
}

function StatusCard({ online, active, inactive, current }: { online: boolean; active: boolean; inactive: boolean; current?: Booking }) {
  const good = online && !inactive;
  const state = !online
    ? { title: "You're offline", sub: "Reconnect to receive trip updates.", icon: "cloud-offline" as const, g: ["#F3F4F7", "#FFFFFF"] as const, fg: colors.grey }
    : inactive
      ? { title: "Profile inactive", sub: "Contact Operations to reactivate.", icon: "alert-circle" as const, g: gradients.blush, fg: colors.brand }
      : active
        ? { title: "On a trip", sub: "Your current trip is in progress.", icon: "car-sport" as const, g: ["#FFF6E6", "#FFFFFF"] as const, fg: colors.amber }
        : { title: "You're online", sub: "Assigned trips appear here automatically.", icon: "radio" as const, g: gradients.mint, fg: colors.green };
  return (
    <LinearGradient colors={state.g} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ borderRadius: 20, padding: 16, flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderColor: colors.border }}>
      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={state.icon} size={26} color={state.fg} />
        {good && <View style={{ position: "absolute", right: 2, bottom: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: active ? colors.amber : colors.green, borderWidth: 2, borderColor: colors.surface }} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 19, fontWeight: "900", color: colors.text }}>{state.title}</Text>
        <Label small muted>{state.sub}</Label>
      </View>
      {current && <StatusBadge booking={current} />}
    </LinearGradient>
  );
}

export function HomeScreen() {
  const q = useDriver<Home>("dashboard", "", true), p = useDriver<Profile>("profile"), e = useDriver<Earnings>("earnings");
  const { session, online } = useApp();
  const first = p.data?.firstName || session?.user.name?.split(" ")[0] || "Driver";
  const d = q.data;
  const current = d?.active[0];
  const focus = current || d?.next || undefined;
  const today = istParts(Date.now())?.date;
  const todayEarnings = e.data?.items.filter((i) => istParts(i.pickupDateTime)?.date === today).reduce((sum, i) => sum + Number(i.driverPayout || 0), 0);
  const focusWhen = focus ? istParts(focus.pickupDateTime) : null;
  // Everything else coming up: the rest of today plus the next trip when it is later.
  const later = d ? [...d.today, ...(d.next && !d.today.some((b) => b.id === d.next!.id) ? [d.next] : [])].filter((b) => b.id !== focus?.id) : [];
  return (
    <Screen header={<HomeHeader first={first} unread={d?.unread || 0} />} refresh={() => { void q.refetch(); void p.refetch(); void e.refetch(); }} refreshing={q.isRefetching}>
      <FadeIn><StatusCard online={online} active={!!current} inactive={!!p.data && p.data.status !== "ACTIVE"} current={current} /></FadeIn>
      {!!d?.expiringDocuments && (
        <Notice tone="red" icon="document-text" title="Documents need attention" text={`${d.expiringDocuments} document(s) expired or due within 30 days. Contact Operations.`} onPress={() => router.push("/documents")} />
      )}
      <StateView loading={q.isPending} error={q.error} retry={() => void q.refetch()} />
      {d && (
        <>
          <FadeIn delay={60} style={{ gap: 12 }}>
            <SectionTitle title="Today's Summary" sub={new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })} action="View All" onAction={() => router.push("/trips")} />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <StatCard label="Trips today" value={String(d.today.length)} icon="car-sport" tone="red" />
              <StatCard label="Earnings today" value={todayEarnings == null ? "—" : money(todayEarnings)} icon="wallet" tone="green" />
              <StatCard label={current ? "Current trip" : "Next trip"} value={focusWhen?.time.replace(" ", " ") || "—"} icon="time" tone="blue" />
            </View>
          </FadeIn>
          {current && d.active.length > 1 && <Notice tone="amber" text="You have more than one active trip. Contact Operations to resolve the overlap." />}
          {focus ? (
            <FadeIn delay={120}>
              <Pulse>
                <Card highlight>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Ionicons name={current ? "navigate-circle" : "calendar"} size={22} color={colors.brand} />
                      <Text style={{ fontSize: 18, fontWeight: "900", color: colors.text }}>{current ? "Current Trip" : "Next Trip"}</Text>
                    </View>
                    <StatusBadge booking={focus} large />
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={{ backgroundColor: colors.text, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 }}>
                      <Text style={{ color: "#FFFFFF", fontSize: 19, fontWeight: "900" }}>{focusWhen?.time || "—"}</Text>
                    </View>
                    <Label small muted>{focusWhen?.date}{tripPhase(focus) === "upcoming" || tripPhase(focus) === "scheduled" ? ` · ${relative(focus.pickupDateTime)}` : ""}</Label>
                  </View>
                  <RouteBlock pickup={focus.pickupLocation} drop={focus.dropLocation} />
                  <View style={{ gap: 6, backgroundColor: colors.bg, borderRadius: 14, padding: 12 }}>
                    <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                      <Ionicons name="car-outline" size={17} color={colors.muted} />
                      <Text style={{ fontSize: 14, color: colors.text, fontWeight: "700" }} numberOfLines={1}>{focus.vehicle.make} {focus.vehicle.model} · {focus.vehicle.registrationNumber}</Text>
                    </View>
                    {!!`${focus.customer.firstName}${focus.customer.lastName}`.trim() && (
                      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                        <Ionicons name="person-outline" size={17} color={colors.muted} />
                        <Text style={{ fontSize: 14, color: colors.text, fontWeight: "700" }} numberOfLines={1}>{focus.customer.firstName} {focus.customer.lastName}</Text>
                      </View>
                    )}
                  </View>
                  <PrimaryCTA title={current ? "Continue Current Trip" : "View Trip"} icon={current ? "navigate" : "arrow-forward-circle"} onPress={() => router.push({ pathname: "/trip", params: { id: focus.id } })} />
                </Card>
              </Pulse>
            </FadeIn>
          ) : (
            <Card><StateView empty emptyIcon="car-sport-outline" emptyTitle="No upcoming trips" emptyText="When your partner assigns a trip, it will appear here." /></Card>
          )}
          {later.length > 0 && (
            <>
              <SectionTitle title="Coming up" icon="calendar-outline" tone="blue" />
              {later.map((b) => <TripCard key={b.id} booking={b} />)}
            </>
          )}
        </>
      )}
      {!!p.data?.vehicles.length && (
        <>
          <SectionTitle title="My Vehicle" icon="car-sport-outline" tone="grey" />
          <Card>{p.data.vehicles.map((v) => <VehicleRow key={v.id} vehicle={v} onPress={() => router.push("/vehicle")} />)}</Card>
        </>
      )}
      <Notice tone="red" icon="shield-checkmark" title="Safety & support" text="Emergency, trip sharing and Operations contacts." onPress={() => router.push("/safety")} />
    </Screen>
  );
}

import React from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Avatar, BottomCTA, Card, colors, Label, Notice, RouteBlock, Screen, SectionTitle, StateView, StatTiles, StatusBadge, TripCard, VehicleRow } from "../components/ui";
import { useDriver } from "../services/driver";
import { useApp } from "../state/Providers";
import { istParts } from "../utils/when";
import { relative } from "../utils/trips";
import type { Home, Profile } from "../types";

function HomeHeader({ first, unread }: { first: string; unread: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surface }}>
      <Avatar name={first} size={46} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 20, fontWeight: "800", color: colors.text }}>Hi {first}!</Text>
        <Label small muted>Ready to drive today?</Label>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={unread ? `Notifications, ${unread} unread` : "Notifications"}
        onPress={() => router.push("/notifications")}
        style={{ width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}
      >
        <Ionicons name="notifications-outline" size={24} color={colors.text} />
        {unread > 0 && (
          <View style={{ position: "absolute", top: 6, right: 6, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}>
            <Text style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "800" }}>{unread > 99 ? "99+" : unread}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

export function HomeScreen() {
  const q = useDriver<Home>("dashboard", "", true), p = useDriver<Profile>("profile");
  const { session, online } = useApp();
  const first = p.data?.firstName || session?.user.name?.split(" ")[0] || "Driver";
  const d = q.data;
  const current = d?.active[0];
  const next = d?.next;
  const ready = p.data?.status === "ACTIVE";
  // Home's one primary action: back into the trip in progress, else the next trip.
  const cta = current
    ? { title: "Continue Current Trip", icon: "navigate" as const, id: current.id }
    : next
      ? { title: "View Next Trip", icon: "arrow-forward-circle" as const, id: next.id }
      : null;
  const nextWhen = next ? istParts(next.pickupDateTime) : null;
  return (
    <Screen
      header={<HomeHeader first={first} unread={d?.unread || 0} />}
      refresh={() => { void q.refetch(); void p.refetch(); }}
      refreshing={q.isRefetching}
      footer={cta ? <BottomCTA title={cta.title} icon={cta.icon} onPress={() => router.push({ pathname: "/trip", params: { id: cta.id } })} /> : undefined}
    >
      <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: online && ready !== false ? colors.green : colors.faint }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>{!online ? "You're offline" : current ? "On a trip" : "You're online"}</Text>
          <Label small muted>
            {!online ? "Reconnect to receive trip updates." : p.data && !ready ? "Your profile is inactive. Contact Operations." : "Assigned trips appear here automatically."}
          </Label>
        </View>
        {current && <StatusBadge booking={current} />}
      </Card>
      {!!d?.expiringDocuments && (
        <Notice
          tone="red"
          icon="document-text-outline"
          text={`${d.expiringDocuments} document(s) expired or due within 30 days. Contact Operations.`}
          onPress={() => router.push("/documents")}
        />
      )}
      <StateView loading={q.isPending} error={q.error} retry={() => void q.refetch()} />
      {d && (
        <>
          <Card style={{ paddingVertical: 12 }}>
            <SectionTitle title="Today's Summary" action="View All" onAction={() => router.push("/trips")} />
            <StatTiles
              items={[
                { label: "Trips today", value: String(d.today.length), icon: "car-outline", tone: "green" },
                { label: "Active", value: String(d.active.length), icon: "navigate-outline", tone: "amber" },
                { label: "Updates", value: String(d.unread), icon: "notifications-outline", tone: "red" },
              ]}
            />
          </Card>
          {current && d.active.length > 1 && <Notice tone="amber" text="You have more than one active trip. Contact Operations to resolve the overlap." />}
          {next ? (
            <Card onPress={() => router.push({ pathname: "/trip", params: { id: next.id } })}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 17, fontWeight: "800", color: colors.text }}>Next Trip</Text>
                <StatusBadge booking={next} />
              </View>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
                <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>{nextWhen?.time}</Text>
                <Label small muted>{nextWhen?.date} · {relative(next.pickupDateTime)}</Label>
              </View>
              <RouteBlock pickup={next.pickupLocation} drop={next.dropLocation} compact />
            </Card>
          ) : (
            !current && <StateView empty emptyIcon="car-outline" emptyTitle="No upcoming trips" emptyText="When your partner assigns a trip, it will appear here." />
          )}
          {d.today.filter((b) => b.id !== next?.id && b.id !== current?.id).length > 0 && (
            <>
              <SectionTitle title="Later today" />
              {d.today.filter((b) => b.id !== next?.id && b.id !== current?.id).map((b) => <TripCard key={b.id} booking={b} />)}
            </>
          )}
        </>
      )}
      {!!p.data?.vehicles.length && (
        <>
          <SectionTitle title="My Vehicle" />
          <Card>{p.data.vehicles.map((v) => <VehicleRow key={v.id} vehicle={v} onPress={() => router.push("/vehicle")} />)}</Card>
        </>
      )}
      <Notice tone="grey" icon="shield-checkmark-outline" text="Safety & support" onPress={() => router.push("/safety")} />
    </Screen>
  );
}

import React from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Avatar, BookingCard, Card, colors, EmptyState, FadeIn, ListRow, Menu, money, Screen, SectionTitle, shadow, shortId, StandingCard, State, StatCard } from "../components/ui";
import { useVendor } from "../services/vendor";
import { useApp } from "../state/Providers";
import { statusTone } from "../utils/status";
import type { Driver, Home as HomeData, Page, Profile } from "../types";

type Earnings = { wallet: { balance: string } | null; totals: { settlementStatus: string; _sum: { netAmount: string | null } }[] };
function greeting(now = new Date()) {
  const h = new Date(now.getTime() + 19800000).getUTCHours();
  return h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening";
}

function Header({ company, vendorId, unread }: { company: string; vendorId?: string; unread: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, backgroundColor: colors.surface }}>
      <Avatar name={company} size={46} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, color: colors.muted, fontWeight: "600" }}>{greeting()},</Text>
        <Text style={{ fontSize: 17, fontWeight: "900", color: colors.text, letterSpacing: -0.2 }} numberOfLines={1}>{company}</Text>
        {!!vendorId && <Text style={{ fontSize: 12, color: colors.muted, fontWeight: "600" }}>Vendor ID: {shortId(vendorId)}</Text>}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={unread ? `Notifications, ${unread} unread` : "Notifications"}
        onPress={() => router.push("/notifications")}
        hitSlop={6}
        style={({ pressed }) => [{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }, pressed && { backgroundColor: colors.greySoft }]}
      >
        <Ionicons name="notifications" size={25} color={colors.text} />
        {unread > 0 && (
          <View style={{ position: "absolute", top: 5, right: 4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, borderWidth: 2, borderColor: colors.surface }}>
            <Text style={{ color: "#FFFFFF", fontSize: 9.5, fontWeight: "900" }}>{unread > 99 ? "99+" : unread}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

// Red finance hero: the wallet balance when provisioned, otherwise settled earnings.
function FinanceHero({ e }: { e?: Earnings }) {
  const settled = (e?.totals || []).filter((t) => ["green", "blue"].includes(statusTone(t.settlementStatus))).reduce((sum, t) => sum + Number(t._sum.netAmount || 0), 0);
  const wallet = e?.wallet;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Open earnings" onPress={() => router.push("/earnings")} style={({ pressed }) => pressed && { opacity: 0.94, transform: [{ scale: 0.99 }] }}>
      <LinearGradient colors={["#F2453F", "#E0302B", "#C2201C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 20, paddingVertical: 18, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", overflow: "hidden", ...shadow }}>
        <View style={{ position: "absolute", right: -30, top: -50, width: 150, height: 150, borderRadius: 75, backgroundColor: "#FFFFFF12" }} />
        <View style={{ position: "absolute", right: 60, bottom: -70, width: 130, height: 130, borderRadius: 65, backgroundColor: "#FFFFFF0D" }} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: "#FFFFFFE6", fontWeight: "700", fontSize: 13.5 }}>{wallet ? "Available Balance" : "Settled Earnings"}</Text>
          <Text style={{ color: "#FFFFFF", fontSize: 32, fontWeight: "900", letterSpacing: -0.8 }} numberOfLines={1} adjustsFontSizeToFit>
            {e ? money(wallet ? wallet.balance : settled) : "—"}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
            <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: "#FFFFFF33", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="checkmark" size={11} color="#FFFFFF" />
            </View>
            <Text style={{ color: "#FFFFFFD9", fontSize: 12.5, fontWeight: "600" }}>{wallet ? "Vendor wallet" : "Recorded by RideGrid Finance"}</Text>
          </View>
        </View>
        <View style={{ width: 54, height: 54, borderRadius: 16, backgroundColor: "#FFFFFF26", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="stats-chart" size={26} color="#FFFFFF" />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export default function Home() {
  const q = useVendor<HomeData>("home"), p = useVendor<Profile>("profile"), e = useVendor<Earnings>("earnings", "?page=1");
  const n = useVendor<{ unread: number }>("notifications", "?page=1");
  const drivers = useVendor<Page<Driver>>("drivers", "?page=1");
  const { session } = useApp();
  const d = q.data;
  const company = p.data?.companyName || session?.user.name || "Your business";
  const driverCount = drivers.data ? `${drivers.data.items.length}${drivers.data.hasMore ? "+" : ""}` : "—";
  return (
    <Screen
      header={<Header company={company} vendorId={p.data?.id} unread={n.data?.unread || 0} />}
      refresh={() => { void q.refetch(); void p.refetch(); void e.refetch(); void n.refetch(); void drivers.refetch(); }}
      refreshing={q.isRefetching}
    >
      <FadeIn><FinanceHero e={e.data} /></FadeIn>
      <FadeIn delay={50} style={{ flexDirection: "row", gap: 8 }}>
        <StatCard label="Vehicles" value={d?.standing?.totalVehicles ?? "—"} icon="car-sport" tone="green" onPress={() => router.push("/fleet")} />
        <StatCard label="Drivers" value={driverCount} icon="person" tone="red" onPress={() => router.push("/drivers")} />
        <StatCard label="Today's Bookings" value={d?.todayBookings ?? "—"} icon="calendar" tone="blue" onPress={() => router.push("/bookings")} />
        <StatCard label="Live Vehicles" value={d?.standing?.liveVehicles ?? "—"} icon="storefront" tone="amber" onPress={() => router.push("/fleet")} />
      </FadeIn>
      <State loading={q.isPending} error={q.error} retry={() => q.refetch()} />
      {d && (
        <>
          <SectionTitle title="Recent Bookings" action="View All" onAction={() => router.push("/bookings")} />
          {d.nextTrips.length ? (
            <View style={{ gap: 10 }}>
              {d.nextTrips.slice(0, 4).map((b, i) => <FadeIn key={b.id} delay={80 + i * 40}><BookingCard booking={b} /></FadeIn>)}
            </View>
          ) : (
            <Card style={{ paddingVertical: 4 }}><EmptyState icon="calendar-outline" tone="blue" title="No recent bookings yet" text="New bookings for your fleet will appear here." /></Card>
          )}
          {d.standing && <StandingCard standing={d.standing} />}
          {(d.pending > 0 || d.attentionVehicles > 0 || d.expiringDocuments > 0) && (
            <Menu>
              {d.pending > 0 && <ListRow icon="person-add-outline" tone="red" title={`${d.pending} booking${d.pending === 1 ? "" : "s"} need a driver`} subtitle="Align a driver, then confirm" last={!d.attentionVehicles && !d.expiringDocuments} onPress={() => router.push("/bookings")} />}
              {d.attentionVehicles > 0 && <ListRow icon="construct-outline" tone="amber" title={`${d.attentionVehicles} vehicle${d.attentionVehicles === 1 ? "" : "s"} need attention`} subtitle="Maintenance or blocked" last={!d.expiringDocuments} onPress={() => router.push("/fleet")} />}
              {d.expiringDocuments > 0 && <ListRow icon="document-text-outline" tone="red" title={`${d.expiringDocuments} document${d.expiringDocuments === 1 ? "" : "s"} expiring`} subtitle="Expired or due within 30 days" last onPress={() => router.push("/fleet")} />}
            </Menu>
          )}
        </>
      )}
    </Screen>
  );
}

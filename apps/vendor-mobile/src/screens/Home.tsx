import React from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Avatar, BookingCard, Card, colors, FadeIn, gradients, Label, ListRow, Menu, money, Notice, Pulse, Screen, SectionTitle, shadow, shortId, StandingCard, State, StatCard } from "../components/ui";
import { useVendor } from "../services/vendor";
import { useApp } from "../state/Providers";
import type { Home as HomeData, Profile } from "../types";

type Earnings = { wallet: { balance: string } | null };
function greeting(now = new Date()) {
  const h = new Date(now.getTime() + 19800000).getUTCHours();
  return h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening";
}

function Header({ company, vendorId, unread }: { company: string; vendorId?: string; unread: number }) {
  return (
    <LinearGradient colors={gradients.soft} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16 }}>
      <Avatar name={company} size={52} ring />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, color: colors.muted, fontWeight: "700" }}>{greeting()},</Text>
        <Text style={{ fontSize: 21, fontWeight: "900", color: colors.text, letterSpacing: -0.4 }} numberOfLines={1}>{company}</Text>
        {!!vendorId && <Text style={{ fontSize: 12.5, color: colors.muted, fontWeight: "700" }}>Vendor ID · {shortId(vendorId)}</Text>}
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

export default function Home() {
  const q = useVendor<HomeData>("home"), p = useVendor<Profile>("profile"), e = useVendor<Earnings>("earnings", "?page=1");
  const n = useVendor<{ unread: number }>("notifications", "?page=1");
  const { session } = useApp();
  const d = q.data;
  const company = p.data?.companyName || session?.user.name || "Your business";
  return (
    <Screen
      header={<Header company={company} vendorId={p.data?.id} unread={n.data?.unread || 0} />}
      refresh={() => { void q.refetch(); void p.refetch(); void e.refetch(); void n.refetch(); }}
      refreshing={q.isRefetching}
    >
      <State loading={q.isPending} error={q.error} retry={() => q.refetch()} />
      {d && (
        <>
          {e.data?.wallet && (
            <FadeIn>
              <Pressable accessibilityRole="button" accessibilityLabel="Open earnings" onPress={() => router.push("/earnings")} style={({ pressed }) => pressed && { opacity: 0.92 }}>
                <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 20, gap: 4, overflow: "hidden", ...shadow }}>
                  <View style={{ position: "absolute", right: -40, top: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: "#FFFFFF14" }} />
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name="wallet" size={18} color="#FFFFFFCC" />
                    <Text style={{ color: "#FFFFFFCC", fontWeight: "800", fontSize: 13, letterSpacing: 0.6 }}>WALLET BALANCE</Text>
                  </View>
                  <Text style={{ color: "#FFFFFF", fontSize: 36, fontWeight: "900", letterSpacing: -1 }} numberOfLines={1} adjustsFontSizeToFit>{money(e.data.wallet.balance)}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ color: "#FFFFFFD9", fontSize: 14, fontWeight: "700" }}>View earnings & settlements</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFFD9" />
                  </View>
                </LinearGradient>
              </Pressable>
            </FadeIn>
          )}
          <FadeIn delay={60} style={{ gap: 10 }}>
            {d.standing && (
              <View style={{ flexDirection: "row", gap: 10 }}>
                <StatCard label="Vehicles in fleet" value={d.standing.totalVehicles} icon="car-sport" tone="red" onPress={() => router.push("/fleet")} />
                <StatCard label="Live in marketplace" value={d.standing.liveVehicles} icon="storefront" tone="green" onPress={() => router.push("/fleet")} />
              </View>
            )}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <StatCard label="Today's bookings" value={d.todayBookings} icon="calendar" tone="blue" onPress={() => router.push("/bookings")} />
              <StatCard label="Upcoming" value={d.upcoming} icon="time" tone="amber" onPress={() => router.push("/bookings")} />
              <StatCard label="Ongoing" value={d.active} icon="navigate" tone="green" onPress={() => router.push("/bookings")} />
            </View>
          </FadeIn>
          {d.pending > 0 && (
            <Pulse>
              <Notice tone="red" icon="person-add" title={`${d.pending} booking${d.pending === 1 ? "" : "s"} need a driver`} text="Align a driver to the vehicle, then confirm on the booking." onPress={() => router.push("/bookings")} />
            </Pulse>
          )}
          {d.attentionVehicles > 0 && <Notice tone="amber" icon="construct" title="Vehicles need attention" text={`${d.attentionVehicles} vehicle${d.attentionVehicles === 1 ? " is" : "s are"} in maintenance or blocked.`} onPress={() => router.push("/fleet")} />}
          {d.expiringDocuments > 0 && <Notice tone="red" icon="document-text" title="Documents expiring" text={`${d.expiringDocuments} vehicle document${d.expiringDocuments === 1 ? "" : "s"} expire within 30 days or have expired.`} onPress={() => router.push("/fleet")} />}
          {d.standing && <StandingCard standing={d.standing} />}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <StatCard label="Free vehicles today" value={d.availableVehicles} icon="checkmark-circle" tone="green" onPress={() => router.push("/fleet")} />
            <StatCard label="Free drivers today" value={d.availableDrivers} icon="person-circle" tone="blue" onPress={() => router.push("/drivers")} />
            <StatCard label="Reserved drivers" value={d.assignedDrivers} icon="people" tone="amber" onPress={() => router.push("/drivers")} />
          </View>
          <SectionTitle title="Next Trips" sub="Today and upcoming" icon="calendar-outline" tone="red" action="View All" onAction={() => router.push("/bookings")} />
          {d.nextTrips.length ? (
            d.nextTrips.map((b, i) => <FadeIn key={b.id} delay={i * 50}><BookingCard booking={b} /></FadeIn>)
          ) : (
            <Card><State empty emptyIcon="calendar-outline" emptyTitle="No upcoming trips" emptyText="New bookings will appear here." /></Card>
          )}
          <Menu>
            <ListRow icon="today-outline" tone="blue" title="Check availability" subtitle="Vehicles and drivers by date" onPress={() => router.push("/availability")} />
            <ListRow icon="wallet-outline" tone="green" title="Earnings & settlements" subtitle="Wallet, settlements and trip earnings" last onPress={() => router.push("/earnings")} />
          </Menu>
          <SectionTitle title="Latest Updates" icon="notifications-outline" tone="amber" action="See all" onAction={() => router.push("/notifications")} />
          {d.notifications.length ? (
            <Card style={{ gap: 0, paddingVertical: 4 }}>
              {d.notifications.map((x, i) => (
                <View key={x.id} style={{ flexDirection: "row", gap: 12, paddingVertical: 12, borderBottomWidth: i < d.notifications.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, marginTop: 6, backgroundColor: x.readAt ? colors.border : colors.brand }} />
                  <View style={{ flex: 1 }}>
                    <Label bold>{x.title}</Label>
                    <Label small muted lines={2}>{x.message}</Label>
                  </View>
                </View>
              ))}
            </Card>
          ) : (
            <Card><State empty emptyIcon="notifications-off-outline" emptyTitle="You're all caught up" emptyText="No recent notifications." /></Card>
          )}
          <Label small muted center>Asia/Kolkata · updated {new Date(d.asOf).toLocaleTimeString()}</Label>
        </>
      )}
    </Screen>
  );
}

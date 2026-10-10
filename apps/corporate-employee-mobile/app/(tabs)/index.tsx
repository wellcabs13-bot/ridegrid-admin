import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Card, ErrorState, Heading, KeyValue, LoadingState, MenuRow, OfflineBanner, T, colors, s } from "../../src/components/ui";
import { BudgetCard, TripCard } from "../../src/components/Corporate";
import { corp } from "../../src/services/api";
import { useApp } from "../../src/state/Providers";
import type { Home } from "../../src/types";
import { money } from "../../src/utils/journey";

type IconName = React.ComponentProps<typeof Ionicons>["name"];
function Tile({ icon, title, sub, badge, onPress }: { icon: IconName; title: string; sub: string; badge?: number; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={{ flexBasis: "48%", flexGrow: 1 }}>
      <View style={[s.card, { alignItems: "center", paddingVertical: 18, gap: 6 }]}>
        <View>
          <Ionicons name={icon} size={30} color={colors.brand} />
          {!!badge && (
            <View style={{ position: "absolute", top: -6, right: -12, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}>
              <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>{badge > 99 ? "99+" : badge}</Text>
            </View>
          )}
        </View>
        <T weight="800" size={14} center>{title}</T>
        <T muted size={11} center>{sub}</T>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { session } = useApp();
  const q = useQuery({ queryKey: ["home", session?.user.id], queryFn: ({ signal }) => corp<Home>("home", "", signal), enabled: !!session });
  const h = q.data;
  const name = h?.profile.name || session?.user.name || "";
  const initials = name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  const canBook = h?.profile.canBook !== false;
  const hour = Number(new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", hour12: false }));
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const awaiting = h?.awaitingMyDecision || 0;
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={s.screen}>
      <View style={[s.header, { gap: 12, paddingHorizontal: 16 }]}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.brand, fontWeight: "800", fontSize: 16 }}>{initials || "R"}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <T weight="800" size={16}>{greeting}, {name.split(" ")[0] || "there"}</T>
          <T muted size={12}>{h?.profile.company.name || " "}</T>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Updates, ${h?.unread || 0} unread`} onPress={() => router.push("/notifications")} style={s.iconButton}>
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
          {!!h?.unread && <View style={{ position: "absolute", top: 9, right: 10, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand }} />}
        </Pressable>
      </View>
      <OfflineBanner />
      <ScrollView contentContainerStyle={s.body} refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={colors.brand} />}>
        <LinearGradient colors={["#1F2937", "#7F1D1D"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 16, padding: 18, minHeight: 112, justifyContent: "center", overflow: "hidden" }}>
          <Ionicons name="airplane" size={90} color="#FFFFFF22" style={{ position: "absolute", right: -6, top: 6 }} />
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800", maxWidth: "70%" }}>Business Travel Made Effortless</Text>
          <Text style={{ color: "#FFFFFFCC", fontSize: 12, marginTop: 4 }}>Safe. Compliant. Productive.</Text>
        </LinearGradient>
        {q.isPending && <LoadingState rows={3} />}
        <ErrorState error={q.error} retry={() => void q.refetch()} />
        {h && (
          <>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              <Tile icon="car-sport" title="Book a Ride" sub="Airport, Office, Outstation" onPress={() => router.push("/book")} />
              <Tile icon="calendar" title="My Trips" sub="View & Manage" onPress={() => router.push("/trips")} />
              <Tile icon="document-text" title="Approvals" sub="Request Status" badge={h.pendingApprovals + awaiting} onPress={() => router.push("/approvals")} />
              <Tile icon="wallet" title="Policy & Wallet" sub="Limits & Billing" onPress={() => router.push("/policy")} />
            </View>
            {!canBook && (
              <Card tone={colors.amber}><T muted size={13}>Booking is not enabled for your profile. Contact your travel administrator. You can still view your trips{awaiting ? " and review requests" : ""}.</T></Card>
            )}
            {(!!awaiting || h.profile.isApprover) && (
              <Card>
                <MenuRow
                  icon="checkmark-done-outline"
                  title={awaiting ? `${awaiting} request${awaiting === 1 ? "" : "s"} waiting for your approval` : "Requests to review"}
                  subtitle={awaiting ? "Approve or reject colleagues' rides" : "Nothing waiting for you right now"}
                  onPress={() => router.push("/reviews")}
                />
              </Card>
            )}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, backgroundColor: "#ECFDF3", borderWidth: 1, borderColor: "#BBF7D0" }}>
              <Ionicons name="checkmark-circle" size={34} color={colors.emerald} />
              <View style={{ flex: 1 }}>
                <T weight="800" size={14} color={colors.emerald}>{h.policy ? "You're a Policy Compliant Traveler" : "Travel limits apply"}</T>
                <T muted size={12}>{h.policy ? `${h.policy.name}${h.policy.maxTripAmount ? ` · approval above ${money(h.policy.maxTripAmount)}` : ""}` : "Rides are checked against your travel limits and company budgets."}</T>
              </View>
            </View>
            <Heading>Upcoming Trip</Heading>
            {h.upcoming ? <TripCard trip={h.upcoming} /> : <Card><T muted>No upcoming company rides.</T></Card>}
            {h.activeTrips > 0 && <Card><MenuRow icon="navigate-circle-outline" title={`${h.activeTrips} trip${h.activeTrips === 1 ? "" : "s"} in progress`} subtitle="Open My Trips to follow it" onPress={() => router.push("/trips")} /></Card>}
            <BudgetCard budget={h.budget} />
            {h.policy && (
              <Card>
                <KeyValue k="Approval" v={h.policy.approvalRequired ? "Required for every trip" : "Only outside policy"} />
                {!!h.policy.blockAboveAmount && <KeyValue k="Not allowed above" v={money(h.policy.blockAboveAmount)} />}
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

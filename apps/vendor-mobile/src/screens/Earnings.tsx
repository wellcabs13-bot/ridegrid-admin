import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Badge, Button, Card, colors, dateTime, FadeIn, IconTile, Label, ListRow, Menu, money, Screen, SectionTitle, shadow, State, StatCard, tones } from "../components/ui";
import { statusTone } from "../utils/status";
import { useVendor } from "../services/vendor";

type Data = {
  wallet: { balance: string } | null;
  settlements: { id: string; netAmount: string; settlementStatus: string; createdAt: string; settledAt: string | null; settlementReference: string | null }[];
  totals: { settlementStatus: string; _sum: { netAmount: string | null } }[];
  completed: { id: string; bookingNumber: string; vendorEarning: string | null }[];
  hasMore: boolean;
};

export default function Earnings() {
  const [page, setPage] = useState(1),
    [open, setOpen] = useState<"settlements" | "trips" | null>("settlements"),
    q = useVendor<Data>("earnings", `?page=${page}`),
    d = q.data;
  const sum = (pred: (status: string) => boolean) => (d?.totals || []).filter((t) => pred(t.settlementStatus)).reduce((a, t) => a + Number(t._sum.netAmount || 0), 0);
  const settled = sum((st) => ["green", "blue"].includes(statusTone(st)));
  const pending = sum((st) => statusTone(st) === "amber");
  const all = sum(() => true);
  const toggle = (k: "settlements" | "trips") => setOpen((c) => (c === k ? null : k));
  return (
    <Screen title="Earnings" refresh={() => q.refetch()} refreshing={q.isRefetching}>
      <State loading={q.isPending} error={q.error} retry={() => q.refetch()} />
      {d && (
        <>
          <FadeIn>
            <LinearGradient colors={["#F2453F", "#E0302B", "#C2201C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 20, padding: 18, flexDirection: "row", alignItems: "center", gap: 16, overflow: "hidden", ...shadow }}>
              <View style={{ position: "absolute", right: -30, top: -50, width: 150, height: 150, borderRadius: 75, backgroundColor: "#FFFFFF12" }} />
              <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: "#FFFFFF26", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="stats-chart" size={28} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#FFFFFF", fontSize: 32, fontWeight: "900", letterSpacing: -0.8 }} numberOfLines={1} adjustsFontSizeToFit>
                  {money(d.wallet ? d.wallet.balance : settled)}
                </Text>
                <Text style={{ color: "#FFFFFFE6", fontWeight: "700", fontSize: 14 }}>{d.wallet ? "Available Balance" : "Settled Earnings"}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: "#FFFFFF33", alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                  </View>
                  <Text style={{ color: "#FFFFFFD9", fontSize: 12.5, fontWeight: "600" }}>Recorded by RideGrid Finance</Text>
                </View>
              </View>
            </LinearGradient>
          </FadeIn>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <StatCard label="Settled" value={money(settled)} icon="checkmark-circle" tone="green" />
            <StatCard label="Pending" value={money(pending)} icon="time" tone="amber" />
            <StatCard label="Recent trips" value={d.completed.length} icon="car-sport" tone="blue" />
          </View>
          <Card>
            <SectionTitle title="Settlement Summary" sub="Recorded totals by status" />
            {d.totals.length ? (
              d.totals.map((t) => {
                const amount = Number(t._sum.netAmount || 0), tone = tones[statusTone(t.settlementStatus)];
                return (
                  <View key={t.settlementStatus} style={{ gap: 6 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Badge value={t.settlementStatus} />
                      <Text style={{ fontSize: 15.5, fontWeight: "900", color: colors.text }}>{money(amount)}</Text>
                    </View>
                    <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.greySoft, overflow: "hidden" }}>
                      <View style={{ width: `${all > 0 ? Math.max(3, (amount / all) * 100) : 0}%`, height: 8, borderRadius: 4, backgroundColor: tone.fg }} />
                    </View>
                  </View>
                );
              })
            ) : (
              <Label small muted>No settlements recorded yet.</Label>
            )}
          </Card>
          <Menu>
            <ListRow icon="swap-horizontal-outline" tone="blue" title="Settlement History" subtitle={`${d.settlements.length} on this page`} right={<Ionicons name={open === "settlements" ? "chevron-up" : "chevron-down"} size={18} color={colors.faint} />} onPress={() => toggle("settlements")} />
            {open === "settlements" && (
              <View style={{ paddingBottom: 6 }}>
                {d.settlements.map((t) => (
                  <View key={t.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingLeft: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <IconTile icon="cash-outline" tone={statusTone(t.settlementStatus)} size={36} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15.5, fontWeight: "900", color: colors.text }}>{money(t.netAmount)}</Text>
                      <Label small muted>{dateTime(t.settledAt || t.createdAt)}{t.settlementReference ? ` · ${t.settlementReference}` : ""}</Label>
                    </View>
                    <Badge value={t.settlementStatus} />
                  </View>
                ))}
                {!d.settlements.length && <Label small muted>No settlements recorded.</Label>}
              </View>
            )}
            <ListRow icon="receipt-outline" tone="green" title="Trip Earnings" subtitle="Your earning per completed booking" last={open !== "trips"} right={<Ionicons name={open === "trips" ? "chevron-up" : "chevron-down"} size={18} color={colors.faint} />} onPress={() => toggle("trips")} />
            {open === "trips" && (
              <View style={{ paddingBottom: 6 }}>
                {d.completed.map((b, i) => (
                  <Pressable key={b.id} accessibilityRole="button" accessibilityLabel={`Booking ${b.bookingNumber}`} onPress={() => router.push(`/booking?id=${b.id}`)} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingLeft: 6, minHeight: 52, borderBottomWidth: i < d.completed.length - 1 ? 1 : 0, borderBottomColor: colors.border }, pressed && { opacity: 0.7 }]}>
                    <IconTile icon="checkmark-done" tone="green" size={36} />
                    <Text style={{ flex: 1, fontSize: 15, fontWeight: "800", color: colors.text }}>{b.bookingNumber}</Text>
                    <Text style={{ fontSize: 15.5, fontWeight: "900", color: colors.green }}>{money(b.vendorEarning)}</Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.faint} />
                  </Pressable>
                ))}
                {!d.completed.length && <Label small muted>No completed trips on this page.</Label>}
              </View>
            )}
          </Menu>
          {(page > 1 || d.hasMore) && (
            <View style={{ flexDirection: "row", gap: 10 }}>
              {page > 1 && <View style={{ flex: 1 }}><Button title="Previous" icon="chevron-back" variant="secondary" compact onPress={() => setPage((p) => p - 1)} /></View>}
              {d.hasMore && <View style={{ flex: 1 }}><Button title="Next page" icon="chevron-forward" variant="secondary" compact onPress={() => setPage((p) => p + 1)} /></View>}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

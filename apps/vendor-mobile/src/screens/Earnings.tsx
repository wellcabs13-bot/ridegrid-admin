import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Badge, Button, Card, colors, dateTime, FadeIn, gradients, IconTile, Label, money, Pills, Screen, SectionTitle, shadow, State, StatCard, tones } from "../components/ui";
import { statusLabel, statusTone } from "../utils/status";
import { useVendor } from "../services/vendor";

type Data = {
  wallet: { balance: string } | null;
  settlements: { id: string; netAmount: string; settlementStatus: string; createdAt: string; settledAt: string | null; settlementReference: string | null }[];
  totals: { settlementStatus: string; _sum: { netAmount: string | null } }[];
  completed: { id: string; bookingNumber: string; vendorEarning: string | null }[];
  hasMore: boolean;
};
const TABS = [
  { value: "settlements", label: "Settlements", icon: "swap-horizontal-outline" as const },
  { value: "trips", label: "Trip earnings", icon: "receipt-outline" as const },
];

export default function Earnings() {
  const [page, setPage] = useState(1),
    [tab, setTab] = useState("settlements"),
    q = useVendor<Data>("earnings", `?page=${page}`),
    d = q.data;
  return (
    <Screen title="Earnings" refresh={() => q.refetch()} refreshing={q.isRefetching}>
      <State loading={q.isPending} error={q.error} retry={() => q.refetch()} />
      {d && (
        <>
          <FadeIn>
            <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 20, gap: 6, overflow: "hidden", ...shadow }}>
              <View style={{ position: "absolute", right: -40, top: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: "#FFFFFF14" }} />
              <View style={{ position: "absolute", right: 30, bottom: -60, width: 120, height: 120, borderRadius: 60, backgroundColor: "#26B16033" }} />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="wallet" size={18} color="#FFFFFFCC" />
                <Text style={{ color: "#FFFFFFCC", fontWeight: "800", fontSize: 13, letterSpacing: 0.6 }}>RECORDED WALLET BALANCE</Text>
              </View>
              <Text style={{ color: "#FFFFFF", fontSize: 40, fontWeight: "900", letterSpacing: -1 }} numberOfLines={1} adjustsFontSizeToFit>
                {d.wallet ? money(d.wallet.balance) : "Not provisioned"}
              </Text>
              <Text style={{ color: "#FFFFFFD9", fontSize: 14, fontWeight: "600" }}>Amounts are recorded by RideGrid Finance.</Text>
            </LinearGradient>
          </FadeIn>
          {d.totals.length > 0 && (
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              {d.totals.map((t) => (
                <View key={t.settlementStatus} style={{ flexBasis: "47%", flexGrow: 1 }}>
                  <StatCard label={`${statusLabel(t.settlementStatus)} settlements`} value={money(t._sum.netAmount ?? 0)} icon="cash-outline" tone={statusTone(t.settlementStatus)} />
                </View>
              ))}
            </View>
          )}
          <Pills options={TABS} value={tab} onChange={setTab} />
          {tab === "settlements" && (
            <FadeIn style={{ gap: 12 }}>
              <SectionTitle title="Settlement history" sub="Payouts recorded by RideGrid" icon="swap-horizontal-outline" tone="blue" />
              {d.settlements.map((t) => {
                const tone = statusTone(t.settlementStatus);
                return (
                  <Card key={t.id} style={{ borderLeftWidth: 4, borderLeftColor: tones[tone].fg }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <IconTile icon="cash" tone={tone} size={44} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 19, fontWeight: "900", color: colors.text }}>{money(t.netAmount)}</Text>
                        <Label small muted>{dateTime(t.settledAt || t.createdAt)}</Label>
                      </View>
                      <Badge value={t.settlementStatus} />
                    </View>
                    {t.settlementReference && <Label small muted>Reference {t.settlementReference}</Label>}
                  </Card>
                );
              })}
              {!d.settlements.length && <Card><State empty emptyIcon="swap-horizontal-outline" emptyTitle="No settlements recorded" emptyText="Settlements appear here once RideGrid Finance records them." /></Card>}
            </FadeIn>
          )}
          {tab === "trips" && (
            <FadeIn style={{ gap: 12 }}>
              <SectionTitle title="Completed trip earnings" sub="Your earning per completed booking" icon="receipt-outline" tone="green" />
              {d.completed.length ? (
                <Card style={{ gap: 0, paddingVertical: 4 }}>
                  {d.completed.map((b, i) => (
                    <Pressable key={b.id} accessibilityRole="button" accessibilityLabel={`Booking ${b.bookingNumber}`} onPress={() => router.push(`/booking?id=${b.id}`)} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, minHeight: 60, borderBottomWidth: i < d.completed.length - 1 ? 1 : 0, borderBottomColor: colors.border }, pressed && { opacity: 0.7 }]}>
                      <IconTile icon="checkmark-done" tone="green" size={40} />
                      <Text style={{ flex: 1, fontSize: 15.5, fontWeight: "800", color: colors.text }}>{b.bookingNumber}</Text>
                      <Text style={{ fontSize: 17, fontWeight: "900", color: colors.green }}>{money(b.vendorEarning)}</Text>
                      <Ionicons name="chevron-forward" size={18} color={colors.faint} />
                    </Pressable>
                  ))}
                </Card>
              ) : (
                <Card><State empty emptyIcon="receipt-outline" emptyTitle="No completed trips" emptyText="No completed trips on this page." /></Card>
              )}
            </FadeIn>
          )}
          <View style={{ flexDirection: "row", gap: 10 }}>
            {page > 1 && <View style={{ flex: 1 }}><Button title="Previous" icon="chevron-back" variant="secondary" compact onPress={() => setPage((p) => p - 1)} /></View>}
            {d.hasMore && <View style={{ flex: 1 }}><Button title="Next page" icon="chevron-forward" variant="secondary" compact onPress={() => setPage((p) => p + 1)} /></View>}
          </View>
        </>
      )}
    </Screen>
  );
}

import React, { useState } from "react";
import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Card, colors, dateTime, FadeIn, IconTile, Label, money, Notice, Pills, RecordBadge, recordTone, Screen, SectionTitle, shadow, StateView, StatCard, tones } from "../components/ui";
import { useDriver } from "../services/driver";

type Earnings = {
  items: { id: string; bookingNumber: string; pickupDateTime: string; driverPayout: string }[];
  payrolls: { id: string; month: number; year: number; netAmount: string; incentiveAmount: string; penaltyAmount: string; status: string; paidAt: string | null }[];
  incentives: { id: string; incentiveType: string; amount: string; description: string | null }[];
  description: string;
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PERIODS = [
  { value: "WEEK", label: "This Week" },
  { value: "MONTH", label: "This Month" },
  { value: "ALL", label: "Latest 100" },
];
const TABS = [
  { value: "trips", label: "Trips", icon: "receipt-outline" as const },
  { value: "payroll", label: "Payouts", icon: "wallet-outline" as const },
  { value: "incentives", label: "Incentives", icon: "gift-outline" as const },
];
// Start of the current IST week (Monday) or month, as an instant.
function since(period: string, now = new Date()) {
  if (period === "ALL") return 0;
  const ist = new Date(now.getTime() + 19800000);
  const start = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), period === "MONTH" ? 1 : ist.getUTCDate() - ((ist.getUTCDay() + 6) % 7));
  return start - 19800000;
}
const Amount = ({ v, color = colors.text }: { v: string | number; color?: string }) => (
  <Text style={{ fontSize: 18, fontWeight: "900", color, letterSpacing: -0.3 }}>{money(v)}</Text>
);

export function EarningsScreen() {
  const q = useDriver<Earnings>("earnings"), [period, setPeriod] = useState("WEEK"), [tab, setTab] = useState("trips");
  const from = since(period);
  const trips = (q.data?.items || []).filter((e) => new Date(e.pickupDateTime).getTime() >= from);
  const total = trips.reduce((sum, e) => sum + Number(e.driverPayout || 0), 0);
  const label = PERIODS.find((p) => p.value === period)?.label;
  return (
    <Screen title="Earnings" refresh={() => void q.refetch()} refreshing={q.isRefetching}>
      <Pills options={PERIODS} value={period} onChange={setPeriod} />
      <StateView loading={q.isPending} error={q.error} retry={() => void q.refetch()} />
      {q.data && (
        <>
          <FadeIn>
            <LinearGradient colors={["#E53935", "#C62828", "#8E1B1B"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 20, gap: 6, overflow: "hidden", ...shadow }}>
              <View style={{ position: "absolute", right: -40, top: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: "#FFFFFF14" }} />
              <View style={{ position: "absolute", right: 30, bottom: -60, width: 120, height: 120, borderRadius: 60, backgroundColor: "#26B16033" }} />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="wallet" size={18} color="#FFFFFFCC" />
                <Text style={{ color: "#FFFFFFCC", fontWeight: "800", fontSize: 13, letterSpacing: 0.6 }}>RECORDED TRIP EARNINGS · {label?.toUpperCase()}</Text>
              </View>
              <Text style={{ color: "#FFFFFF", fontSize: 42, fontWeight: "900", letterSpacing: -1 }} numberOfLines={1} adjustsFontSizeToFit>{money(total)}</Text>
              <Text style={{ color: "#FFFFFFD9", fontSize: 14, fontWeight: "600" }}>{trips.length} completed trip{trips.length === 1 ? "" : "s"} with a recorded allocation</Text>
            </LinearGradient>
          </FadeIn>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <StatCard label="Trips" value={String(trips.length)} icon="car-sport" tone="green" />
            <StatCard label="Avg. per trip" value={trips.length ? money(Math.round(total / trips.length)) : "—"} icon="trending-up" tone="red" />
            <StatCard label="Payroll periods" value={String(q.data.payrolls.length)} icon="calendar" tone="blue" />
          </View>
          <Pills options={TABS} value={tab} onChange={setTab} />
          {tab === "trips" && (
            <FadeIn style={{ gap: 12 }}>
              <SectionTitle title="Recent earnings" sub="Completed-trip allocations" icon="receipt-outline" tone="green" />
              {!trips.length ? (
                <Card><StateView empty emptyIcon="receipt-outline" emptyTitle="No trip earnings" emptyText="Completed trips with a recorded payout appear here." /></Card>
              ) : (
                <Card style={{ gap: 0, paddingVertical: 4 }}>
                  {trips.map((e, i) => (
                    <View key={e.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: i < trips.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
                      <IconTile icon="checkmark-done" tone="green" size={40} />
                      <View style={{ flex: 1 }}>
                        <Label bold>{e.bookingNumber}</Label>
                        <Label small muted>{dateTime(e.pickupDateTime)}</Label>
                      </View>
                      <Amount v={e.driverPayout} color={colors.green} />
                    </View>
                  ))}
                </Card>
              )}
            </FadeIn>
          )}
          {tab === "payroll" && (
            <FadeIn style={{ gap: 12 }}>
              <SectionTitle title="Payouts" sub="Payroll & payout history" icon="wallet-outline" tone="blue" />
              {!q.data.payrolls.length && <Card><StateView empty emptyIcon="wallet-outline" emptyTitle="No payroll yet" emptyText="Payroll periods appear here once your partner records them." /></Card>}
              {q.data.payrolls.map((p) => {
                const t = tones[recordTone(p.status)];
                return (
                  <Card key={p.id} style={{ borderLeftWidth: 4, borderLeftColor: t.fg }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <IconTile icon="calendar" tone={recordTone(p.status)} size={40} />
                        <Text style={{ fontSize: 17, fontWeight: "900", color: colors.text }}>{MONTHS[p.month - 1] || p.month} {p.year}</Text>
                      </View>
                      <Amount v={p.netAmount} />
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                      <RecordBadge value={p.status} large />
                      <Label small muted>{p.paidAt ? `Paid ${dateTime(p.paidAt)}` : "Payment date not recorded"}</Label>
                    </View>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <View style={{ flex: 1, backgroundColor: colors.greenSoft, borderRadius: 12, padding: 10 }}>
                        <Label small muted>Incentives</Label>
                        <Text style={{ fontWeight: "800", color: colors.green, fontSize: 15 }}>{money(p.incentiveAmount)}</Text>
                      </View>
                      <View style={{ flex: 1, backgroundColor: colors.brandSoft, borderRadius: 12, padding: 10 }}>
                        <Label small muted>Penalties</Label>
                        <Text style={{ fontWeight: "800", color: colors.brand, fontSize: 15 }}>{money(p.penaltyAmount)}</Text>
                      </View>
                    </View>
                  </Card>
                );
              })}
            </FadeIn>
          )}
          {tab === "incentives" && (
            <FadeIn style={{ gap: 12 }}>
              <SectionTitle title="Incentives" sub="Recorded incentives" icon="gift-outline" tone="amber" />
              {!q.data.incentives.length && <Card><StateView empty emptyIcon="gift-outline" emptyTitle="No incentives recorded" emptyText="Incentives appear here once recorded." /></Card>}
              {q.data.incentives.map((i) => (
                <Card key={i.id} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <IconTile icon="gift" tone="amber" size={44} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <RecordBadge value={i.incentiveType} />
                    {!!i.description && <Label small muted>{i.description}</Label>}
                  </View>
                  <Amount v={i.amount} color={colors.green} />
                </Card>
              ))}
            </FadeIn>
          )}
          <Notice tone="grey" icon="information-circle-outline" title="About these figures" text={q.data.description} />
        </>
      )}
    </Screen>
  );
}

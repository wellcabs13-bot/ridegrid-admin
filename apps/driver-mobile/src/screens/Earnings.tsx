import React, { useState } from "react";
import { Text, View } from "react-native";
import { Card, colors, dateTime, Label, ListRow, money, Notice, Pills, RecordBadge, Screen, SectionTitle, StateView, StatTiles } from "../components/ui";
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
// Start of the current IST week (Monday) or month, as an instant.
function since(period: string, now = new Date()) {
  if (period === "ALL") return 0;
  const ist = new Date(now.getTime() + 19800000);
  const start = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), period === "MONTH" ? 1 : ist.getUTCDate() - ((ist.getUTCDay() + 6) % 7));
  return start - 19800000;
}

export function EarningsScreen() {
  const q = useDriver<Earnings>("earnings"), [period, setPeriod] = useState("WEEK"), [section, setSection] = useState<"trips" | "payroll" | "incentives" | null>("trips");
  const from = since(period);
  const trips = (q.data?.items || []).filter((e) => new Date(e.pickupDateTime).getTime() >= from);
  const total = trips.reduce((sum, e) => sum + Number(e.driverPayout || 0), 0);
  const toggle = (s: typeof section) => setSection((cur) => (cur === s ? null : s));
  return (
    <Screen title="Earnings" refresh={() => void q.refetch()} refreshing={q.isRefetching}>
      <Pills options={PERIODS} value={period} onChange={setPeriod} />
      <StateView loading={q.isPending} error={q.error} retry={() => void q.refetch()} />
      {q.data && (
        <>
          <Card style={{ alignItems: "center", gap: 4, paddingVertical: 22 }}>
            <Text style={{ fontSize: 38, fontWeight: "900", color: colors.text }}>{money(total)}</Text>
            <Label muted>Recorded trip earnings</Label>
          </Card>
          <StatTiles
            tinted
            items={[
              { label: "Trips", value: String(trips.length), tone: "green" },
              { label: "Avg. per trip", value: trips.length ? money(Math.round(total / trips.length)) : "—", tone: "amber" },
              { label: "Payroll periods", value: String(q.data.payrolls.length), tone: "blue" },
            ]}
          />
          <Card style={{ gap: 0, paddingVertical: 4 }}>
            <ListRow icon="receipt-outline" title="Trip History" subtitle={`${trips.length} completed trip allocations`} onPress={() => toggle("trips")} />
            {section === "trips" && (
              <View style={{ paddingBottom: 8 }}>
                {!trips.length && <StateView empty emptyIcon="receipt-outline" emptyTitle="No trip earnings" emptyText="Completed trips with a recorded payout appear here." />}
                {trips.map((e) => (
                  <View key={e.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <View style={{ flex: 1 }}>
                      <Label bold>{e.bookingNumber}</Label>
                      <Label small muted>{dateTime(e.pickupDateTime)}</Label>
                    </View>
                    <Text style={{ fontSize: 17, fontWeight: "800", color: colors.text }}>{money(e.driverPayout)}</Text>
                  </View>
                ))}
              </View>
            )}
            <ListRow icon="wallet-outline" title="Payouts" subtitle="Payroll & payout history" onPress={() => toggle("payroll")} />
            {section === "payroll" && (
              <View style={{ paddingBottom: 8 }}>
                {!q.data.payrolls.length && <StateView empty emptyIcon="wallet-outline" emptyTitle="No payroll yet" emptyText="Payroll periods appear here once your partner records them." />}
                {q.data.payrolls.map((p) => (
                  <View key={p.id} style={{ gap: 4, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Label bold>{MONTHS[p.month - 1] || p.month} {p.year}</Label>
                      <Text style={{ fontSize: 17, fontWeight: "800", color: colors.text }}>{money(p.netAmount)}</Text>
                    </View>
                    <RecordBadge value={p.status} />
                    <Label small muted>Incentives {money(p.incentiveAmount)} · Penalties {money(p.penaltyAmount)}</Label>
                    <Label small muted>{p.paidAt ? `Paid ${dateTime(p.paidAt)}` : "Payment date not recorded"}</Label>
                  </View>
                ))}
              </View>
            )}
            <ListRow icon="gift-outline" title="Incentives" subtitle="Recorded incentives" last={section !== "incentives"} onPress={() => toggle("incentives")} />
            {section === "incentives" && (
              <View style={{ paddingBottom: 8 }}>
                {!q.data.incentives.length && <StateView empty emptyIcon="gift-outline" emptyTitle="No incentives recorded" emptyText="Incentives appear here once recorded." />}
                {q.data.incentives.map((i) => (
                  <View key={i.id} style={{ gap: 4, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <RecordBadge value={i.incentiveType} />
                      <Text style={{ fontSize: 17, fontWeight: "800", color: colors.text }}>{money(i.amount)}</Text>
                    </View>
                    {!!i.description && <Label small muted>{i.description}</Label>}
                  </View>
                ))}
              </View>
            )}
          </Card>
          <SectionTitle title="About these figures" />
          <Notice tone="grey" text={q.data.description} />
        </>
      )}
    </Screen>
  );
}

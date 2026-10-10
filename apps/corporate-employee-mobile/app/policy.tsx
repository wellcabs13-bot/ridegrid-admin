import { useState } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Card, ErrorState, Heading, KeyValue, LoadingState, Screen, Segmented, T, colors } from "../src/components/ui";
import { BudgetCard } from "../src/components/Corporate";
import { corp } from "../src/services/api";
import { useApp } from "../src/state/Providers";
import type { Budget, Config, PolicySummary, Profile } from "../src/types";
import { label, money } from "../src/utils/journey";

const yes = (v: boolean) => (v ? "Allowed" : "Not allowed");
const hour = (h: number) => `${String(h % 24).padStart(2, "0")}:00`;
const SCOPE = { COMPANY: "Company policy", BRANCH: "Your branch's policy", DEPARTMENT: "Your department's policy", ASSIGNED: "Assigned to you" } as const;
// PolicyCard: the employee-facing subset of the active company travel policy.
export default function Policy() {
  const { session } = useApp();
  const q = useQuery({ queryKey: ["policy", session?.user.id], queryFn: ({ signal }) => corp<PolicySummary>("policy", "", signal), enabled: !!session });
  const b = useQuery({ queryKey: ["budget", session?.user.id], queryFn: ({ signal }) => corp<Budget>("budget", "", signal), enabled: !!session });
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState(params.tab === "billing" ? "BILLING" : "POLICY");
  const profile = useQuery({ queryKey: ["profile", session?.user.id], queryFn: ({ signal }) => corp<Profile>("profile", "", signal), enabled: !!session });
  const config = useQuery({ queryKey: ["config", session?.user.id], queryFn: ({ signal }) => corp<Config>("config", "", signal), enabled: !!session });
  const p = q.data?.policy;
  return (
    <Screen title="Travel Policy / Billing" refresh={() => { void q.refetch(); void b.refetch(); }} refreshing={q.isRefetching}>
      {q.isPending && <LoadingState />}
      <ErrorState error={q.error} retry={() => void q.refetch()} />
      <Segmented values={["POLICY", "BILLING"]} value={tab} format={(v) => (v === "POLICY" ? "Travel Policy" : "Billing")} onChange={setTab} />
      {q.data && tab === "BILLING" && (
        <>
          <Card>
            <Heading>Corporate billing</Heading>
            <KeyValue k="Company" v={profile.data?.company.name || "-"} />
            <KeyValue k="Billing cycle" v={profile.data ? label(profile.data.company.billingCycle) : "-"} />
            <KeyValue k="Payment method" v={config.data ? (config.data.paymentAvailable ? "Corporate credit" : "Corporate credit unavailable") : "Checking..."} />
            <T muted size={12}>All rides are billed to your company's corporate account. Contact your Corporate Administrator for statements, credit or limits.</T>
          </Card>
          {b.data && <BudgetCard budget={b.data} />}
          {b.data && !b.data.visible && <Card><T muted size={13}>Your company has not set personal travel limits for you.</T></Card>}
        </>
      )}
      {q.data && tab === "POLICY" && (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, backgroundColor: "#ECFDF3", borderWidth: 1, borderColor: "#BBF7D0" }}>
            <Ionicons name="checkmark-circle" size={30} color={colors.emerald} />
            <View style={{ flex: 1 }}>
              <T weight="800" size={14} color={colors.emerald}>{p ? "Your rides follow company travel policy" : "Travel limits apply"}</T>
              <T muted size={12}>Checked by RideGrid on every search and booking.</T>
            </View>
          </View>
          <Card tone={colors.blue}>
            <Heading>{p ? p.name : "No active company policy"}</Heading>
            {p ? (
              <>
                {!!p.scope && <KeyValue k="Applies to you as" v={SCOPE[p.scope]} />}
                {!!p.description && <T muted size={13}>{p.description}</T>}
                <KeyValue k="Approval above" v={p.maxTripAmount ? money(p.maxTripAmount) : "No fixed limit"} />
                {!!p.blockAboveAmount && <KeyValue k="Not allowed above" v={money(p.blockAboveAmount)} />}
                <KeyValue k="Vehicle categories" v={p.allowedCategories.length ? p.allowedCategories.map(label).join(", ") : "Any category"} />
                <KeyValue k="Book in advance" v={p.advanceBookingHours ? `At least ${p.advanceBookingHours} hour(s)` : "No minimum"} />
                <KeyValue k="Outstation travel" v={yes(p.outstationAllowed)} />
                {p.roundTripAllowed !== undefined && <KeyValue k="Round trips" v={yes(p.roundTripAllowed)} />}
                {p.localAllowed !== undefined && <KeyValue k="Local rentals" v={yes(p.localAllowed)} />}
                {p.allowedCities !== undefined && <KeyValue k="Pickup cities" v={p.allowedCities.length ? `${p.allowedCities.join(", ")} (others need approval)` : "Any city"} />}
                {p.bookingStartHour != null && p.bookingEndHour != null && <KeyValue k="Pickup hours" v={`${hour(p.bookingStartHour)} to ${hour(p.bookingEndHour)} IST (outside needs approval)`} />}
                {p.weekendTravelAllowed !== undefined && <KeyValue k="Weekend travel" v={p.weekendTravelAllowed ? "Allowed" : "Needs approval"} />}
                <KeyValue k="Night travel (10 PM to 6 AM)" v={p.nightTravelAllowed ? "Allowed" : "Needs approval"} />
                <KeyValue k="Every trip needs approval" v={p.approvalRequired ? "Yes" : "No"} />
              </>
            ) : (
              <T muted>Your company has not published a travel policy. Rides are checked against your travel limits and company budgets.</T>
            )}
          </Card>
          <Card>
            <Heading>How decisions work</Heading>
            <T size={14}><T color={colors.emerald} weight="700">Within policy</T>: book immediately.</T>
            <T size={14}><T color={colors.amber} weight="700">Approval required</T>: over a limit or outside a rule. Submit it, and book at a fresh price once approved.</T>
            <T size={14}><T color={colors.red} weight="700">Not allowed</T>: prohibited by policy (for example a disallowed service, too short notice, or above the hard limit). These cannot be approved.</T>
          </Card>
          {!!q.data.approvalStages.length && (
            <Card>
              <Heading>Approval chain</Heading>
              {q.data.approvalStages.map((s) => (
                <KeyValue key={s.level} k={`Level ${s.level}`} v={`${s.approver}${s.maxAmount != null ? ` · up to ${money(s.maxAmount)}` : ""}`} />
              ))}
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}

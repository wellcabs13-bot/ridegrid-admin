import React from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Card, Heading, KeyValue, Pill, Row, T, colors } from "./ui";
import type { Approval, Budget, BudgetPeriod, Decision, Fare, Listing, Notice, PolicyResult, Trip } from "../types";
import { dateTime, decisionLabel, label, money, serviceLabel } from "../utils/journey";

export const decisionColor = (d: Decision) => (d === "ALLOWED" ? colors.emerald : d === "APPROVAL_REQUIRED" ? colors.amber : colors.red);

export function PolicyBadge({ decision }: { decision: Decision }) {
  const icon = decision === "ALLOWED" ? "checkmark-circle" : decision === "APPROVAL_REQUIRED" ? "time" : "close-circle";
  return <Pill text={decisionLabel(decision)} color={decisionColor(decision)} icon={icon} />;
}
export function PolicyReasons({ policy }: { policy: PolicyResult }) {
  if (!policy.reasons.length) return null;
  return (
    <View style={{ gap: 4 }}>
      {policy.reasons.map((r) => (
        <Row key={r}>
          <Ionicons name={policy.decision === "NOT_ALLOWED" ? "ban-outline" : "information-circle-outline"} size={15} color={decisionColor(policy.decision)} />
          <View style={{ flex: 1 }}>
            <T size={13} muted>{r}</T>
          </View>
        </Row>
      ))}
    </View>
  );
}
const APPROVAL_COLOR: Record<string, string> = { PENDING: colors.amber, APPROVED: colors.emerald, BOOKED: colors.brand, REJECTED: colors.red, CANCELLED: colors.muted, EXPIRED: colors.muted };
export function ApprovalBadge({ status }: { status: string }) {
  return <Pill text={label(status)} color={APPROVAL_COLOR[status] || colors.purple} />;
}
const TRIP_COLOR: Record<string, string> = { PENDING: colors.amber, CONFIRMED: colors.brand, DRIVER_ASSIGNED: colors.purple, TRIP_STARTED: colors.emerald, TRIP_COMPLETED: colors.emerald, CANCELLED: colors.red };
export function StatusBadge({ status }: { status: string }) {
  return <Pill text={label(status)} color={TRIP_COLOR[status] || colors.muted} />;
}

// FareBreakdown: shown exactly as the server quoted it. The app never computes GST or fees.
export function FareBreakdown({ fare }: { fare: Fare }) {
  return (
    <Card>
      <Heading>Fare breakdown</Heading>
      <KeyValue k="Base fare" v={money(fare.vendorFare)} />
      <KeyValue k="Platform fee" v={money(fare.platformFee)} />
      {fare.taxComponents.length ? fare.taxComponents.map((t) => <KeyValue key={t.name} k={`${t.name}${t.rate ? ` (${t.rate}%)` : ""}`} v={money(t.amount)} />) : <KeyValue k="GST" v={money(fare.taxAmount)} />}
      {Number(fare.passThroughTotal) > 0 && <KeyValue k="Tolls, parking and charges" v={money(fare.passThroughTotal)} />}
      {Number(fare.discount) > 0 && <KeyValue k="Discount" v={`- ${money(fare.discount)}`} />}
      <View style={{ height: 1, backgroundColor: colors.border }} />
      <KeyValue k="Final fare" v={<T size={18} weight="800" color={colors.brand}>{money(fare.finalPayable)}</T>} />
    </Card>
  );
}
export function MarketplaceListingCard({ listing, onPress, disabled }: { listing: Listing; onPress: () => void; disabled?: boolean }) {
  const v = listing.vehicle;
  const blocked = listing.policy.decision === "NOT_ALLOWED";
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${v.make} ${v.model}, ${decisionLabel(listing.policy.decision)}`} disabled={disabled} onPress={onPress} style={{ opacity: disabled ? 0.6 : 1 }}>
      <Card tone={decisionColor(listing.policy.decision)}>
        <Row>
          <View style={{ flex: 1, minWidth: 150 }}>
            <Heading>{v.make} {v.model}</Heading>
            <T muted size={13}>{label(v.category)} · {v.seatingCapacity} seats · {label(v.fuelType)}</T>
          </View>
          <T size={20} weight="800" color={blocked ? colors.muted : colors.text}>{money(listing.pricing.fare?.finalPayable)}</T>
        </Row>
        <T size={13} muted>{listing.vendor?.companyName || "Vendor"}{listing.driver ? ` · Driver ${listing.driver.name}${listing.driver.verified ? " (verified)" : ""}` : ""}</T>
        {listing.pricing.fare && (
          <T size={12} muted>
            Base {money(listing.pricing.fare.vendorFare)} · Platform fee {money(listing.pricing.fare.platformFee)} · GST {money(listing.pricing.fare.taxAmount)}
          </T>
        )}
        <PolicyBadge decision={listing.policy.decision} />
        <PolicyReasons policy={listing.policy} />
      </Card>
    </Pressable>
  );
}
export function TripCard({ trip }: { trip: Trip }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Trip ${trip.bookingNumber}`} onPress={() => router.push({ pathname: "/trip", params: { id: trip.id } })}>
      <Card>
        <Row>
          <View style={{ flex: 1 }}>
            <T weight="700">{trip.bookingNumber}</T>
          </View>
          <StatusBadge status={trip.status} />
        </Row>
        <T size={16} weight="700">{trip.pickupLocation}</T>
        <T muted size={13}>to {trip.dropLocation}</T>
        <T muted size={13}>{dateTime(trip.pickupDateTime)} · {serviceLabel(trip.service)}</T>
        <T size={13}>{trip.vehicle.make} {trip.vehicle.model} · {trip.vendor.companyName}{trip.driver ? ` · ${trip.driver.name}` : ""}</T>
      </Card>
    </Pressable>
  );
}
export function ApprovalCard({ approval }: { approval: Approval }) {
  const r = approval.ride;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Request ${label(approval.status)}`} onPress={() => router.push({ pathname: "/approval", params: { id: approval.id } })}>
      <Card tone={APPROVAL_COLOR[approval.status]}>
        <Row>
          <View style={{ flex: 1 }}>
            <T weight="700">{r ? `${r.route.pickupCity}${r.route.dropCity ? ` to ${r.route.dropCity}` : ""}` : "Ride request"}</T>
          </View>
          <ApprovalBadge status={approval.status} />
        </Row>
        {r && <T muted size={13}>{dateTime(r.pickupDateTime)} · {r.vehicle.make} {r.vehicle.model}</T>}
        <T size={13}>Requested {money(approval.amount)} · Submitted {dateTime(approval.submittedAt)}</T>
      </Card>
    </Pressable>
  );
}
export function StatusTimeline({ items }: { items: { title: string; at: string | null; done: boolean; note?: string | null }[] }) {
  return (
    <View style={{ gap: 0 }}>
      {items.map((item, i) => (
        <View key={`${item.title}-${i}`} style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ alignItems: "center", width: 16 }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, marginTop: 4, backgroundColor: item.done ? colors.brand : colors.border }} />
            {i < items.length - 1 && <View style={{ width: 2, flex: 1, backgroundColor: colors.border }} />}
          </View>
          <View style={{ flex: 1, paddingBottom: 14 }}>
            <T weight="600" size={14}>{item.title}</T>
            <T muted size={12}>{item.at ? dateTime(item.at) : "Pending"}</T>
            {!!item.note && <T muted size={12}>{item.note}</T>}
          </View>
        </View>
      ))}
    </View>
  );
}
function BudgetMeter({ title, p }: { title: string; p: BudgetPeriod }) {
  const ratio = Number(p.limit) > 0 ? Math.min(1, Number(p.used) / Number(p.limit)) : 1;
  const tone = ratio >= 1 ? colors.red : ratio >= 0.8 ? colors.amber : colors.emerald;
  return (
    <View style={{ gap: 6 }}>
      <Row>
        <View style={{ flex: 1 }}><T weight="600" size={14}>{title}</T></View>
        <T size={13} muted>{money(p.remaining)} left</T>
      </Row>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.raised, overflow: "hidden" }}>
        <View style={{ width: `${Math.round(ratio * 100)}%`, height: 8, backgroundColor: tone }} />
      </View>
      <T size={12} muted>Used {money(p.used)} of {money(p.limit)}</T>
    </View>
  );
}
export function BudgetCard({ budget }: { budget: Budget }) {
  if (!budget.visible) return null;
  return (
    <Card>
      <Heading>Your travel limits</Heading>
      {budget.monthly && <BudgetMeter title="This month" p={budget.monthly} />}
      {budget.yearly && <BudgetMeter title="This year" p={budget.yearly} />}
      <T size={12} muted>{budget.basis}</T>
    </Card>
  );
}
export function NotificationCard({ notice, onPress }: { notice: Notice; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={notice.title} onPress={onPress}>
      <Card tone={notice.readAt ? undefined : colors.brand}>
        <Row>
          <Ionicons name={notice.readAt ? "mail-open-outline" : "mail-unread-outline"} size={18} color={notice.readAt ? colors.muted : colors.brand} />
          <View style={{ flex: 1 }}><T weight="700">{notice.title}</T></View>
        </Row>
        <T muted size={14}>{notice.message}</T>
        <T muted size={12}>{dateTime(notice.createdAt)}</T>
      </Card>
    </Pressable>
  );
}
export function CorporateHeader({ name, company, detail }: { name: string; company: string; detail?: string }) {
  return (
    <Card tone={colors.blue}>
      <T muted size={13}>Signed in for</T>
      <T size={20} weight="800">{company}</T>
      <T size={14}>{name}{detail ? ` · ${detail}` : ""}</T>
    </Card>
  );
}

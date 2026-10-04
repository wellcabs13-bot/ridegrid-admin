import React from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, Heading, KeyValue, Pill, Row, T, colors } from "./ui";
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
      <Heading>Fare Details</Heading>
      <KeyValue k="Base fare" v={money(fare.vendorFare)} />
      <KeyValue k="Platform fee" v={money(fare.platformFee)} />
      {fare.taxComponents.length ? fare.taxComponents.map((t) => <KeyValue key={t.name} k={`${t.name}${t.rate ? ` (${t.rate}%)` : ""}`} v={money(t.amount)} />) : <KeyValue k="GST" v={money(fare.taxAmount)} />}
      {Number(fare.passThroughTotal) > 0 && <KeyValue k="Tolls, parking and charges" v={money(fare.passThroughTotal)} />}
      {Number(fare.discount) > 0 && <KeyValue k="Discount" v={`- ${money(fare.discount)}`} />}
      <View style={{ height: 1, backgroundColor: colors.border }} />
      <KeyValue k="Total Fare (All Inclusive)" v={<T size={18} weight="800" color={colors.brand}>{money(fare.finalPayable)}</T>} />
    </Card>
  );
}
function CarThumb({ size = 64 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size * 0.75, borderRadius: 10, backgroundColor: colors.raised, alignItems: "center", justifyContent: "center" }}>
      <Ionicons name="car-sport" size={size * 0.5} color={colors.muted} />
    </View>
  );
}
const initials = (n: string) => n.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
      <T weight="800" size={Math.round(size * 0.36)} color={colors.brand}>{initials(name) || "D"}</T>
    </View>
  );
}
function Spec({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>["name"]; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Ionicons name={icon} size={13} color={colors.muted} />
      <T size={12} muted>{text}</T>
    </View>
  );
}
const Divider = () => <View style={{ height: 1, backgroundColor: colors.border }} />;
function VehicleSpecs({ v }: { v: Listing["vehicle"] }) {
  return (
    <Row>
      <Spec icon="people-outline" text={`${v.seatingCapacity} seats`} />
      {v.luggageCapacity != null && <Spec icon="briefcase-outline" text={`${v.luggageCapacity} bags`} />}
      <Spec icon="water-outline" text={label(v.fuelType)} />
      <Spec icon="settings-outline" text={label(v.transmission)} />
    </Row>
  );
}
// DriverVendorRows: the exact assigned driver and the vendor, exactly as the marketplace returns them.
function DriverVendorRows({ driver, vendor }: { driver: Listing["driver"]; vendor: Listing["vendor"] }) {
  return (
    <>
      <Row>
        <Avatar name={driver?.name || ""} />
        <View style={{ flex: 1 }}>
          <T weight="700" size={14}>{driver ? driver.name : "Driver assigned after booking"}</T>
          {driver && <T size={11} color={driver.verified ? colors.blue : colors.muted} weight="700">{driver.verified ? "Verified Driver" : "Driver"}</T>}
        </View>
      </Row>
      <Row>
        <Ionicons name="storefront-outline" size={18} color={colors.muted} />
        <View style={{ flex: 1 }}><T weight="600" size={13}>{vendor?.companyName || "Vendor"}</T></View>
      </Row>
    </>
  );
}
const inclusions = (p: Listing["pricing"]) => [p.includedKm != null ? `${p.includedKm} km` : "", p.includedHours ? `${p.includedHours} hr` : "", p.packageName].filter(Boolean).join(" · ");
export function MarketplaceListingCard({ listing, onPress, disabled, recommended }: { listing: Listing; onPress: () => void; disabled?: boolean; recommended?: boolean }) {
  const v = listing.vehicle;
  const blocked = listing.policy.decision === "NOT_ALLOWED";
  const fare = listing.pricing.fare;
  const included = inclusions(listing.pricing);
  return (
    <Card tone={recommended ? colors.emerald : undefined}>
      {recommended && <Pill text="Recommended" color={colors.emerald} icon="checkmark-circle" />}
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <CarThumb size={84} />
        <View style={{ flex: 1, gap: 2 }}>
          <T weight="800" size={16}>{v.make} {v.model}</T>
          <T muted size={12}>{v.registrationNumber} · {label(v.category)}</T>
          <T size={20} weight="800" color={blocked ? colors.muted : colors.text}>{money(fare?.finalPayable)}</T>
          <T size={11} muted>{included ? `All inclusive · ${included}` : "All inclusive"}</T>
        </View>
      </View>
      <VehicleSpecs v={v} />
      <Divider />
      <DriverVendorRows driver={listing.driver} vendor={listing.vendor} />
      <Row>
        <PolicyBadge decision={listing.policy.decision} />
        {!blocked && <Pill text="Corporate Billing" color={colors.emerald} icon="checkmark-circle" />}
      </Row>
      <PolicyReasons policy={listing.policy} />
      <Button title="Select This Ride" arrow secondary={!recommended} disabled={disabled} onPress={onPress} />
    </Card>
  );
}
// ListingSummary: the exact car, exact driver and vendor for the ride detail screen.
export function ListingSummary({ listing }: { listing: Listing }) {
  const v = listing.vehicle;
  const included = inclusions(listing.pricing);
  return (
    <>
      <Card>
        <Row>
          <Pill text={decisionLabel(listing.policy.decision)} color={decisionColor(listing.policy.decision)} icon="checkmark-circle" />
          {!!listing.driver?.verified && <Pill text="Verified Driver" color={colors.blue} icon="shield-checkmark" />}
        </Row>
        <View style={{ alignItems: "center", paddingVertical: 6 }}>
          <CarThumb size={170} />
        </View>
        <T weight="800" size={20}>{v.make} {v.model}{v.variant ? ` ${v.variant}` : ""}</T>
        <T muted size={13}>{v.registrationNumber} · {label(v.category)}</T>
        <VehicleSpecs v={v} />
        {!!included && <T muted size={12}>Includes {included}</T>}
      </Card>
      <Card>
        <Heading>Driver and vendor</Heading>
        <DriverVendorRows driver={listing.driver} vendor={listing.vendor} />
      </Card>
    </>
  );
}
export function TripCard({ trip }: { trip: Trip }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Trip ${trip.bookingNumber}`} onPress={() => router.push({ pathname: "/trip", params: { id: trip.id } })}>
      <Card>
        <Row>
          <View style={{ flex: 1 }}>
            <T weight="800" size={15}>{trip.pickupLocation} → {trip.dropLocation}</T>
          </View>
          <StatusBadge status={trip.status} />
        </Row>
        <T muted size={12}>{dateTime(trip.pickupDateTime)} · {serviceLabel(trip.service)} · {trip.bookingNumber}</T>
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <Row>
          <CarThumb size={52} />
          <View style={{ flex: 1 }}>
            <T size={13} weight="600">{trip.driver ? trip.driver.name : "Driver being assigned"} · {trip.vehicle.make} {trip.vehicle.model}</T>
            <T size={12} muted>{trip.vendor.companyName}</T>
          </View>
          <T size={16} weight="800">{money(trip.finalFare)}</T>
        </Row>
      </Card>
    </Pressable>
  );
}
export function ApprovalCard({ approval }: { approval: Approval }) {
  const r = approval.ride;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Request ${label(approval.status)}`} onPress={() => router.push({ pathname: "/approval", params: { id: approval.id } })}>
      <Card>
        <Row>
          <View style={{ flex: 1 }}>
            <T weight="800" size={15}>{r ? `${r.route.pickupCity}${r.route.dropCity ? ` → ${r.route.dropCity.replaceAll("|", ", ")}` : ""}` : "Ride request"}</T>
          </View>
          <ApprovalBadge status={approval.status} />
        </Row>
        {r && <T muted size={12}>{dateTime(r.pickupDateTime)}</T>}
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <Row>
          <CarThumb size={52} />
          <View style={{ flex: 1 }}>
            {r && <T size={13} weight="600">{r.vehicle.make} {r.vehicle.model}</T>}
            <T size={12} muted>Submitted {dateTime(approval.submittedAt)}{approval.status === "PENDING" && approval.currentStage ? ` · ${label(approval.currentStage)}` : ""}</T>
          </View>
          <T size={16} weight="800">{money(approval.amount)}</T>
        </Row>
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
      {budget.assigned?.map((b) => <BudgetMeter key={`${b.name}-${b.periodStart}`} title={b.name} p={b} />)}
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

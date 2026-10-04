import React, { useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import {
  Avatar,
  Badge,
  BookingCard,
  Button,
  Card,
  colors,
  Documents,
  FadeIn,
  gradients,
  IconTile,
  Label,
  ListRow,
  Menu,
  money,
  Notice,
  RouteBlock,
  Screen,
  SectionTitle,
  shortId,
  State,
  StatCard,
  dateTime,
  name,
} from "../components/ui";
import { useSave, useVendor } from "../services/vendor";
import { useApp } from "../state/Providers";
import { bookingStatus, statusLabel } from "../utils/status";
import { istParts } from "../utils/when";
import type { Booking, Driver, Vehicle } from "../types";

function Hero({ children }: React.PropsWithChildren) {
  return (
    <LinearGradient colors={gradients.blush} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 22, padding: 16, gap: 12, borderWidth: 1, borderColor: colors.border }}>
      {children}
    </LinearGradient>
  );
}
function InfoRow({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 }}>
      <Ionicons name={icon} size={18} color={colors.muted} />
      <Text style={{ fontSize: 14, color: colors.muted, fontWeight: "600", width: 110 }}>{label}</Text>
      <Text style={{ flex: 1, fontSize: 15, color: colors.text, fontWeight: "700" }}>{value}</Text>
    </View>
  );
}

export default function Details({ kind }: { kind: "booking" | "vehicle" | "driver" }) {
  const { id } = useLocalSearchParams<{ id: string }>(),
    section = kind === "booking" ? "bookings" : kind === "vehicle" ? "fleet" : "drivers";
  const q = useVendor<Booking & Vehicle & Driver>(section, `?id=${encodeURIComponent(id || "")}`),
    d = q.data;
  const save = useSave(section),
    assignment = useSave("assignment"),
    { online } = useApp();
  const [message, setMessage] = useState("");
  async function status(value: string) {
    setMessage("");
    try {
      await save.mutateAsync({ id, action: "status", status: value });
      setMessage("Status saved.");
    } catch {}
  }
  async function confirm() {
    if (!d) return;
    setMessage("");
    try {
      await assignment.mutateAsync({ bookingId: d.id, vehicleId: d.vehicleId, driverId: d.vehicle.driverId });
      setMessage("Assignment confirmed by RideGrid.");
    } catch {}
  }
  const canConfirm = kind === "booking" && !!d && ["PENDING", "CONFIRMED"].includes(d.status) && !!d.vehicle?.driverId;
  return (
    <Screen
      title={kind === "booking" ? "Booking Details" : kind === "vehicle" ? "Vehicle Details" : "Driver Details"}
      refresh={() => q.refetch()}
      refreshing={q.isRefetching}
    >
      <State loading={q.isPending} error={q.error} retry={() => q.refetch()} />
      {!!message && <Notice tone="green" icon="checkmark-circle" text={message} />}
      <State error={save.error || assignment.error} />
      {d && kind === "booking" && <BookingBody d={d} canConfirm={canConfirm} confirm={confirm} busy={!online || assignment.isPending} />}
      {d && kind === "vehicle" && (
        <>
          <FadeIn>
            <Hero>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <LinearGradient colors={["#FFFFFF", "#F1F2F6"]} style={{ width: 72, height: 72, borderRadius: 20, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="car-sport" size={40} color={colors.text} />
                </LinearGradient>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontSize: 21, fontWeight: "900", color: colors.text }}>{d.make} {d.model}</Text>
                  <View style={{ alignSelf: "flex-start", borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 6, backgroundColor: colors.surface }}>
                    <Text style={{ fontSize: 14, fontWeight: "800", letterSpacing: 1, color: colors.text }}>{d.registrationNumber}</Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                    <Badge value={d.status} />
                    <Badge value={d.isVerified ? "VERIFIED" : "PENDING_VERIFICATION"} />
                  </View>
                </View>
              </View>
            </Hero>
          </FadeIn>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <StatCard label="Category" value={statusLabel(d.category)} icon="car-outline" tone="blue" />
            <StatCard label="Seats" value={d.seatingCapacity} icon="people-outline" tone="green" />
            <StatCard label="Fuel" value={statusLabel(d.fuelType)} icon="flash-outline" tone="amber" />
          </View>
          <Card style={{ gap: 0 }}>
            <InfoRow icon="settings-outline" label="Transmission" value={statusLabel(d.transmission)} />
            <InfoRow icon="location-outline" label="Home city" value={d.homeCity || "Not recorded"} />
            <InfoRow icon="person-outline" label="Driver" value={name(d.driver)} />
          </Card>
          {d.listingPhotos !== undefined && (
            <Notice
              tone={d.listingPhotos > 0 ? "green" : "amber"}
              icon="images-outline"
              title="Listing photos"
              text={
                d.listingPhotos > 0
                  ? `${d.listingPhotos} approved photo${d.listingPhotos === 1 ? "" : "s"} shown to customers.`
                  : "No car photos yet. Customers see a placeholder until you send clear photos of this car (outside and inside) to RideGrid Operations. Never send documents or ID cards as car photos."
              }
              onPress={() => router.push(`/support?vehicle=${encodeURIComponent(d.registrationNumber)}`)}
            />
          )}
          <SectionTitle title="Manage" icon="options-outline" tone="red" />
          <Button title="Edit Vehicle" icon="create-outline" large onPress={() => router.push({ pathname: "/edit-vehicle", params: { id } })} />
          <Menu>
            {["AVAILABLE", "MAINTENANCE"].includes(d.status) && (
              <ListRow
                icon={d.status === "AVAILABLE" ? "construct-outline" : "checkmark-circle-outline"}
                tone={d.status === "AVAILABLE" ? "amber" : "green"}
                title={d.status === "AVAILABLE" ? "Set maintenance" : "Mark available"}
                onPress={!online || save.isPending ? undefined : () => void status(d.status === "AVAILABLE" ? "MAINTENANCE" : "AVAILABLE")}
              />
            )}
            <ListRow icon="person-add-outline" tone="blue" title="Align a driver" subtitle={d.driver ? `Currently ${name(d.driver)}` : "No driver aligned"} onPress={() => router.push(`/assignment?vehicleId=${d.id}`)} />
            <ListRow icon="today-outline" tone="grey" title="Date availability" onPress={() => router.push("/availability")} />
            <ListRow icon="cloud-upload-outline" tone="green" title="Upload document" last onPress={() => router.push(`/document-upload?entity=vehicle&entityId=${d.id}`)} />
          </Menu>
          <Documents items={d.documents} />
        </>
      )}
      {d && kind === "driver" && (
        <>
          <FadeIn>
            <Hero>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <Avatar name={name(d)} size={68} ring />
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={{ fontSize: 21, fontWeight: "900", color: colors.text }}>{name(d)}</Text>
                  <Text style={{ fontSize: 13, color: colors.muted, fontWeight: "700" }}>Driver ID · {shortId(d.id)}</Text>
                  <Badge value={d.status} />
                </View>
              </View>
            </Hero>
          </FadeIn>
          <Card style={{ gap: 0 }}>
            <InfoRow icon="call-outline" label="Mobile" value={d.user.mobile || "Phone not recorded"} />
            <InfoRow icon="card-outline" label="Licence" value={d.licenseNumber} />
            <InfoRow icon="location-outline" label="City" value={d.city || "City not recorded"} />
          </Card>
          <SectionTitle title="Vehicles" icon="car-sport-outline" tone="blue" />
          {d.vehicles.length ? (
            <Menu>
              {d.vehicles.map((v, i) => <ListRow key={v.id} icon="car-sport-outline" tone="blue" title={v.registrationNumber} last={i === d.vehicles.length - 1} onPress={() => router.push(`/vehicle?id=${v.id}`)} />)}
            </Menu>
          ) : (
            <Notice tone="grey" text="No vehicle aligned. Align this driver from a vehicle's details." />
          )}
          <SectionTitle title="Manage" icon="options-outline" tone="red" />
          <Button title="Edit Driver" icon="create-outline" large onPress={() => router.push({ pathname: "/edit-driver", params: { id } })} />
          <Menu>
            {d.status !== "SUSPENDED" && (
              <ListRow
                icon={d.status === "ACTIVE" ? "pause-circle-outline" : "play-circle-outline"}
                tone={d.status === "ACTIVE" ? "amber" : "green"}
                title={d.status === "ACTIVE" ? "Set inactive" : "Mark active"}
                onPress={!online || save.isPending ? undefined : () => void status(d.status === "ACTIVE" ? "INACTIVE" : "ACTIVE")}
              />
            )}
            <ListRow icon="today-outline" title="Date availability" onPress={() => router.push("/availability")} />
            <ListRow icon="cloud-upload-outline" tone="green" title="Upload document" last onPress={() => router.push(`/document-upload?entity=driver&entityId=${d.id}`)} />
          </Menu>
          <Documents items={d.documents} />
          <SectionTitle title="Upcoming assignments" icon="calendar-outline" tone="amber" />
          {d.bookings.map((b) => <BookingCard key={b.id} booking={b} />)}
          {!d.bookings.length && <Card><State empty emptyIcon="calendar-outline" emptyTitle="No upcoming assignments" emptyText="Bookings for this driver appear here." /></Card>}
        </>
      )}
    </Screen>
  );
}

function BookingBody({ d, canConfirm, confirm, busy }: { d: Booking; canConfirm: boolean; confirm: () => void; busy: boolean }) {
  const when = istParts(d.pickupDateTime), status = bookingStatus(d);
  return (
    <>
      <FadeIn>
        <Hero>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <Badge value={status} large />
            <Text style={{ fontSize: 13, color: colors.muted, fontWeight: "700" }}>{d.bookingNumber}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <IconTile icon="calendar" tone="red" size={46} solid />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 24, fontWeight: "900", color: colors.text, letterSpacing: -0.4 }}>{when?.time || "—"}</Text>
              <Text style={{ fontSize: 14, color: colors.muted, fontWeight: "600" }}>{when?.date || "Pickup time not recorded"}</Text>
            </View>
            {d.vendorEarning != null && (
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 20, fontWeight: "900", color: colors.green }}>{money(d.vendorEarning)}</Text>
                <Text style={{ fontSize: 11.5, color: colors.muted, fontWeight: "700" }}>Your earning</Text>
              </View>
            )}
          </View>
        </Hero>
      </FadeIn>
      {canConfirm && (
        <Card highlight>
          <Label bold>A driver is aligned to {d.vehicle.registrationNumber}</Label>
          <Label small muted>RideGrid checks eligibility and conflicts before confirming.</Label>
          <Button title="Confirm aligned driver" icon="checkmark-done" large disabled={busy} onPress={confirm} />
        </Card>
      )}
      <SectionTitle title="Route" icon="git-commit-outline" tone="red" />
      <Card><RouteBlock pickup={d.pickupLocation} drop={d.dropLocation} /></Card>
      <SectionTitle title="Trip details" icon="document-text-outline" tone="blue" />
      <Card style={{ gap: 0 }}>
        <InfoRow icon="pricetag-outline" label="Service" value={statusLabel(d.pricingPackage?.packageType || (d.tripType === "ROUNDTRIP" ? "ROUND_TRIP" : "ONE_WAY"))} />
        <InfoRow icon="sunny-outline" label="Duration" value={`${d.tripDays} day${d.tripDays === 1 ? "" : "s"}`} />
        <InfoRow icon="time-outline" label="Reserved until" value={dateTime(d.reservedUntil)} />
        <InfoRow icon="person-outline" label="Customer" value={`${d.customer.firstName} ${d.customer.lastName}`} />
        {d.trip && <InfoRow icon="navigate-outline" label="Trip" value={statusLabel(d.trip.status)} />}
      </Card>
      <SectionTitle title="Vehicle & driver" icon="car-sport-outline" tone="green" />
      <Menu>
        <ListRow icon="car-sport-outline" tone="blue" title={d.vehicle.registrationNumber} subtitle={`${d.vehicle.make} ${d.vehicle.model}`} onPress={() => router.push(`/vehicle?id=${d.vehicleId}`)} />
        <ListRow icon="person-outline" tone="green" title={name(d.driver)} subtitle="Driver" last onPress={d.driverId ? () => router.push(`/driver?id=${d.driverId}`) : undefined} />
      </Menu>
      <SectionTitle title="Payment" icon="card-outline" tone="amber" />
      <Card style={{ gap: 8 }}>
        {d.transactions?.map((t, i) => (
          <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Label bold>{statusLabel(t.paymentMethod)}</Label>
            <Badge value={t.paymentStatus} />
          </View>
        ))}
        {!d.transactions?.length && <Label muted>Payment status not recorded.</Label>}
      </Card>
      <Menu>
        <ListRow icon="headset-outline" tone="green" title="Booking support" subtitle="Call or email Operations about this booking" last onPress={() => router.push(`/support?booking=${encodeURIComponent(d.bookingNumber)}`)} />
      </Menu>
      {!!d.statusHistory?.length && (
        <>
          <SectionTitle title="History" icon="time-outline" tone="grey" />
          <Card style={{ gap: 12 }}>
            {d.statusHistory.map((h) => (
              <View key={h.id} style={{ flexDirection: "row", gap: 10 }}>
                <Ionicons name="ellipse" size={10} color={colors.brand} style={{ marginTop: 6 }} />
                <View style={{ flex: 1, gap: 3 }}>
                  <Badge value={h.currentStatus} />
                  <Label small muted>{statusLabel(h.action)} · {dateTime(h.changedAt)}</Label>
                </View>
              </View>
            ))}
          </Card>
        </>
      )}
    </>
  );
}

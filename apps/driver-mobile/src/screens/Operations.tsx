import React, { useState } from "react";
import { Alert, FlatList, Linking, Modal, Pressable, RefreshControl, Share, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";
import { Badge, BookingCard, Button, Card, Chips, colors, dateTime, Documents, Label, LinkButton, money, Screen, State } from "../components/ui";
import { useDriver } from "../services/driver";
import { post } from "../services/api";
import { useApp, logout } from "../state/Providers";
import { useTracking } from "../state/Tracking";
import { assertOnline } from "../utils/offline";
import { activeLocation, navigationUrl, shareText, tripStatus } from "../utils/trips";
import { useOfflineRows } from "../storage/offline";
import type { Booking, Config, Document, Home, Notice, Page, Profile, Vehicle } from "../types";
const open = (url: string) => Linking.openURL(url).catch(() => Alert.alert("Unable to open", "No compatible app is available. Please try again on your phone."));
export function HomeScreen() {
  const q = useDriver<Home>("dashboard", "", true), p = useDriver<Profile>("profile");
  const { session } = useApp();
  return <Screen title={`Ready, ${session?.user.name?.split(" ")[0] || "Driver"}?`} refresh={() => void q.refetch()} refreshing={q.isRefetching}>
    <Label muted>Your day on the road · {new Date().toLocaleDateString("en-IN")}</Label>
    <State loading={q.isPending} error={q.error} retry={() => void q.refetch()} />
    {q.data && <>
      <Card><Label large>{q.data.unread} unread updates</Label><Label muted>{q.data.expiringDocuments ? `${q.data.expiringDocuments} document(s) expired or due within 30 days. Contact Operations.` : "Check your trip details before setting off."}</Label><LinkButton title="Open notifications" href="/notifications" /></Card>
      {!!q.data.active.length && <><Label large>Current trip</Label>{q.data.active.map(b => <BookingCard key={b.id} booking={b} />)}</>}
      <Label large>Today’s trips</Label><State empty={!q.data.today.length} />{q.data.today.map(b => <BookingCard key={b.id} booking={b} />)}
      {q.data.next && <><Label large>Next pickup</Label><BookingCard booking={q.data.next} /></>}
    </>}
    {p.data?.vehicles.map(v => <VehicleCard key={v.id} vehicle={v} />)}
    <LinkButton title="Safety & support" href="/safety" />
  </Screen>;
}
export function TripsScreen() {
  const [filter, setFilter] = useState("UPCOMING"), [page, setPage] = useState(1);
  const q = useDriver<Page<Booking>>("trips", `?filter=${filter}&page=${page}`, true), { session, online } = useApp();
  const cache = useOfflineRows(session?.user.id, `trips-${filter}-${page}`, q.data?.items || [], online);
  return <Screen title="My trips" scroll={false}>
    <View style={{ padding: 16, gap: 12 }}><Chips values={["UPCOMING", "ACTIVE", "COMPLETED", "CANCELLED"]} value={filter} onChange={f => { setFilter(f); setPage(1); }} /><State loading={q.isPending && online} error={q.error} retry={() => void q.refetch()} /></View>
    {!online && !q.data && cache && <View style={{ padding: 16, gap: 12 }}><Label muted>Saved summaries · {new Date(cache.savedAt).toLocaleString()}. Reconnect to open a trip.</Label>{cache.rows.map((r, i) => <Card key={i}><Label>{String(r.bookingNumber)}</Label><Badge value={String(r.status)} /></Card>)}</View>}
    <FlatList data={q.data?.items || []} keyExtractor={b => b.id} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 30 }} renderItem={({ item }) => <BookingCard booking={item} />} refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={colors.brand} />} ListEmptyComponent={!q.isPending ? <State empty /> : null} ListFooterComponent={<View style={{ gap: 12 }}>{page > 1 && <Button title="Previous page" onPress={() => setPage(page - 1)} />}{q.data?.hasMore && <Button title="Next page" onPress={() => setPage(page + 1)} />}</View>} />
  </Screen>;
}
export function VehicleCard({ vehicle: v }: { vehicle: Vehicle }) {
  return <Card><Label large>{v.make} {v.model}</Label><Badge value={v.registrationNumber} /><Label>{v.category} · {v.fuelType} · {v.transmission}</Label><Label muted>{v.vendor.companyName}</Label></Card>;
}
function ConfirmationSheet({ action, busy, close, confirm }: { action: string; busy: boolean; close: () => void; confirm: () => void }) {
  return <Modal visible={!!action} transparent animationType="slide" onRequestClose={close}><View style={{ flex: 1, backgroundColor: "#000A", justifyContent: "flex-end", padding: 18 }}><Card><Label large>{action === "ARRIVED" ? "Arrived at pickup?" : action === "START" ? "Start this trip?" : "Complete this trip?"}</Label><Label muted>Confirm only when it is safe to do so. RideGrid must receive this update before the trip status changes.</Label><Button title={busy ? "Confirming…" : "Confirm"} disabled={busy} onPress={confirm} /><Button title="Go back" disabled={busy} onPress={close} /></Card></View></Modal>;
}
export function TripScreen() {
  const { id = "" } = useLocalSearchParams<{ id: string }>(), q = useDriver<Booking>("trips", `?id=${encodeURIComponent(id)}`, true), { online } = useApp(), client = useQueryClient(), tracking = useTracking();
  const [action, setAction] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function confirm() {
    setBusy(true); setError("");
    try { assertOnline(online); await post("/api/mobile/driver/trips", { bookingId: id, action }); if (action === "COMPLETE") tracking.stop(); setAction(""); await client.invalidateQueries({ queryKey: ["driver"] }); }
    catch (e) { setAction(""); setError(e instanceof Error ? e.message : "Update failed. Refresh before retrying."); void q.refetch(); }
    finally { setBusy(false); }
  }
  const b = q.data, terminal = b && ["TRIP_COMPLETED", "CANCELLED"].includes(b.status);
  return <Screen title={b?.bookingNumber || "Trip details"} refresh={() => void q.refetch()} refreshing={q.isRefetching}>
    <State loading={q.isPending} error={q.error} retry={() => void q.refetch()} />
    {!!error && <Card><Label>{error}</Label></Card>}
    {b && <>
      <Card><Badge value={tripStatus(b)} /><Label large>{b.pickupLocation}</Label><Label muted>↓ Destination</Label><Label large>{b.dropLocation}</Label><Label>{dateTime(b.pickupDateTime)}</Label><Label muted>{(b.pricingPackage?.packageType || "Service not recorded").replaceAll("_", " ")} · {b.tripType}</Label><Label muted>Trip: {b.trip?.id || "Awaiting arrival"}</Label></Card>

      {!terminal && <>
        <Button title="Navigate to pickup" onPress={() => void open(navigationUrl(b.pickupLocation))} />
        {b.status === "DRIVER_ASSIGNED" && (!b.trip || b.trip.status === "ASSIGNED") && <Button title="Arrived at pickup" disabled={!online || busy} onPress={() => setAction("ARRIVED")} />}
        {b.status === "DRIVER_ASSIGNED" && b.trip?.status === "ARRIVED_AT_PICKUP" && <Button title="Start trip" disabled={!online || busy} onPress={() => setAction("START")} />}
        {b.status === "TRIP_STARTED" && <><Button title="Navigate to destination" onPress={() => void open(navigationUrl(b.dropLocation))} /><Button title="Complete trip" disabled={!online || busy} onPress={() => setAction("COMPLETE")} /></>}
        {activeLocation(b) && <Card><Label>Foreground location sharing</Label><Label muted>{tracking.message}</Label><Label muted>Uploads about every 30 seconds while this app is open and your trip is eligible. Sharing pauses in the background.</Label><Button title={tracking.enabled ? "Stop location sharing" : "Enable location sharing"} onPress={() => void tracking.toggle()} /></Card>}
      </>}
      <VehicleCard vehicle={b.vehicle} />
      <Card><Label>{b.customer.firstName} {b.customer.lastName}</Label><Label muted>Vendor: {b.vendor.companyName}</Label>{!terminal && b.customerPhone && <Button title="Call customer" onPress={() => void open(`tel:${b.customerPhone!.replace(/[^+\d]/g, "")}`)} />}</Card>
      <Button title="Preview route in Maps" onPress={() => void open(`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(b.pickupLocation)}&destination=${encodeURIComponent(b.dropLocation)}&travelmode=driving`)} />
      <LinkButton title="Contact support" href={`/support?id=${encodeURIComponent(id)}`} /><Button title="SOS / Safety" danger onPress={() => router.push({ pathname: "/safety", params: { id } })} />
      <Card><Label large>Trip timeline</Label>{[["Driver assigned", b.trip?.driverAssignedAt], ["Arrived at pickup", b.trip?.arrivedPickupAt], ["Trip started", b.trip?.tripStartedAt], ["Trip completed", b.trip?.tripCompletedAt]].filter(([, date]) => date).map(([label, date]) => <View key={label}><Label>{label}</Label><Label muted>{dateTime(date)}</Label></View>)}{b.statusHistory?.map(h => <View key={h.id}><Badge value={h.currentStatus} /><Label muted>{h.remarks || "Status updated"} · {dateTime(h.changedAt)}</Label></View>)}</Card>
    </>}
    <ConfirmationSheet action={action} busy={busy} close={() => { if (!busy) setAction(""); }} confirm={() => void confirm()} />
  </Screen>;
}
export function NotificationsScreen() {
  const q = useDriver<Notice[]>("notifications", "", true), { online } = useApp(), [busy, setBusy] = useState<string | null>(null), [error, setError] = useState("");
  const client = useQueryClient();
  async function mark(id: string) { setBusy(id); try { assertOnline(online); await post("/api/mobile/driver/notifications", { id }); await client.invalidateQueries({ queryKey: ["driver"] }); } catch(e) { setError(e instanceof Error ? e.message : "Please retry."); } finally { setBusy(null); } }
  return <Screen title="Notifications" scroll={false}><View style={{ padding: 16 }}><State loading={q.isPending} error={q.error} retry={() => void q.refetch()} />{!!error && <Label>{error}</Label>}</View><FlatList data={q.data || []} keyExtractor={n => n.id} contentContainerStyle={{ padding: 16, gap: 14 }} refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} />} ListEmptyComponent={!q.isPending ? <State empty /> : null} renderItem={({ item: n }) => <Card><Badge value={n.readAt ? "READ" : "UNREAD"} /><Label large>{n.title}</Label><Label>{n.message}</Label><Label muted>{dateTime(n.createdAt)}</Label>{!n.readAt && <Button title="Mark read" disabled={!online || busy !== null} onPress={() => void mark(n.id)} />}</Card>} /></Screen>;
}
export function AccountScreen() {
  const q = useDriver<Profile>("profile"), [error, setError] = useState("");
  return <Screen title="Your account" refresh={() => void q.refetch()} refreshing={q.isRefetching}><State loading={q.isPending} error={q.error} retry={() => void q.refetch()} />{q.data && <Card><Label large>{q.data.firstName} {q.data.lastName}</Label><Badge value={q.data.status} /><Label>{q.data.user.email}</Label><Label>{q.data.user.mobile || "Mobile not recorded"}</Label><Label muted>Licence {q.data.licenseNumber}</Label><Badge value={q.data.user.isVerified ? "VERIFIED" : "VERIFICATION_PENDING"} /><Label muted>Contact Operations to update your profile or licence details.</Label></Card>}<LinkButton title="Assigned vehicle" href="/vehicle" /><LinkButton title="Documents & expiry" href="/documents" /><LinkButton title="Recorded earnings" href="/earnings" /><LinkButton title="Safety & support" href="/safety" /><LinkButton title="Security & password" href="/security" />{!!error && <Label>{error}</Label>}<Button title="Log out" onPress={() => void logout().catch(() => setError("Signed out on this device. Server session revocation could not be confirmed."))} /></Screen>;
}
export function VehicleScreen() { const q = useDriver<Vehicle[]>("vehicle"); return <Screen title="Assigned vehicle" refresh={() => void q.refetch()}><State loading={q.isPending} error={q.error} empty={q.data?.length === 0} retry={() => void q.refetch()} />{q.data?.map(v => <VehicleCard key={v.id} vehicle={v} />)}</Screen>; }
export function DocumentsScreen() { const q = useDriver<Document[]>("documents"); return <Screen title="Driver documents" refresh={() => void q.refetch()}><State loading={q.isPending} error={q.error} retry={() => void q.refetch()} />{q.data && <Documents items={q.data} />}<Card><Label muted>Document submissions and updates are handled by your vendor or Operations. Full ID numbers and document files are not displayed here.</Label><LinkButton title="Contact Operations" href="/support" /></Card></Screen>; }
export function EarningsScreen() {
  const q = useDriver<{ items: { id: string; bookingNumber: string; pickupDateTime: string; driverPayout: string }[]; payrolls: { id: string; month: number; year: number; netAmount: string; incentiveAmount: string; penaltyAmount: string; status: string; paidAt: string | null }[]; incentives: { id: string; incentiveType: string; amount: string; description: string | null }[]; description: string }>("earnings");
  return <Screen title="Recorded earnings" refresh={() => void q.refetch()}><State loading={q.isPending} error={q.error} retry={() => void q.refetch()} /><Label muted>{q.data?.description}</Label>
    <Label large>Payroll & payout history</Label><State empty={q.data?.payrolls.length === 0} />{q.data?.payrolls.map(p => <Card key={p.id}><Label>{p.month}/{p.year}</Label><Label large>{money(p.netAmount)}</Label><Badge value={p.status} /><Label muted>Incentives {money(p.incentiveAmount)} · Penalties {money(p.penaltyAmount)}</Label><Label muted>{p.paidAt ? `Paid ${dateTime(p.paidAt)}` : "Payment date not recorded"}</Label></Card>)}
    <Label large>Completed-trip allocations</Label><State empty={q.data?.items.length === 0} />{q.data?.items.map(e => <Card key={e.id}><Label>{e.bookingNumber}</Label><Label large>{money(e.driverPayout)}</Label><Label muted>{dateTime(e.pickupDateTime)}</Label></Card>)}
    <Label large>Recorded incentives</Label><State empty={q.data?.incentives.length === 0} />{q.data?.incentives.map(i => <Card key={i.id}><Badge value={i.incentiveType} /><Label>{money(i.amount)}</Label><Label muted>{i.description}</Label></Card>)}
  </Screen>;
}
export function SafetyScreen({ supportOnly = false }: { supportOnly?: boolean }) {
  const { id } = useLocalSearchParams<{ id?: string }>(), q = useDriver<Config>("config"), [error, setError] = useState("");
  async function shareTrip() {
    try { const { api } = await import("../services/api"); const b = await api<Booking>(`/api/mobile/driver/trips?id=${encodeURIComponent(id!)}`); await Share.share({ message: shareText(b) }); } catch(e) { setError(e instanceof Error ? e.message : "Sharing failed."); }
  }
  async function shareLocation() {
    try { const permission = await Location.requestForegroundPermissionsAsync(); if (!permission.granted) throw new Error("Location permission is required to share your position."); const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }); await Share.share({ message: `My current location: https://www.google.com/maps?q=${p.coords.latitude},${p.coords.longitude}` }); } catch(e) { setError(e instanceof Error ? e.message : "Sharing failed."); }
  }
  return <Screen title={supportOnly ? "Contact Operations" : "Safety first"}><Card><Label large>Stop somewhere safe before using your phone.</Label><Label muted>These actions open your phone or share sheet. RideGrid does not provide emergency monitoring through this app.</Label></Card><State loading={q.isPending} error={q.error} retry={() => void q.refetch()} />{q.data && <><Button title="Call RideGrid support" onPress={() => void open(q.data!.support.phoneHref)} /><Button title="Email Operations" onPress={() => void open(q.data!.support.emailHref + (id ? `?subject=${encodeURIComponent(`Driver trip support: ${id}`)}` : ""))} />{!!q.data.support.whatsapp && <Button title="WhatsApp support" onPress={() => void open(q.data!.support.whatsapp)} />}{!supportOnly && (q.data.emergencyPhone ? <Button title="Call configured emergency number" danger onPress={() => void open(`tel:${q.data!.emergencyPhone!.replace(/[^+\d]/g, "")}`)} /> : <Label muted>No emergency number has been configured. Use your phone’s emergency calling function if needed.</Label>)}</>}{id && <Button title="Share trip details" onPress={() => void shareTrip()} />}{!supportOnly && <Button title="Share my current location" onPress={() => void shareLocation()} />}{!!error && <Label>{error}</Label>}</Screen>;
}
export function SecurityScreen() { return <Screen title="Account security"><Card><Label>Sessions are stored in your device’s secure storage. Your password is never saved.</Label><Label muted>Password recovery uses your registered email address.</Label><LinkButton title="Reset password by email" href="/forgot-password" /></Card></Screen>; }



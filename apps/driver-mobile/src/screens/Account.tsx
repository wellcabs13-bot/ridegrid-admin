import React, { useState } from "react";
import { FlatList, RefreshControl, Share, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";
import { Avatar, Badge, Button, Card, colors, dateTime, FadeIn, gradients, IconTile, Label, ListRow, Notice, RecordBadge, recordTone, Screen, SectionTitle, shadow, StateView, StatCard, tones, VehicleRow } from "../components/ui";
import { useDriver } from "../services/driver";
import { api, post } from "../services/api";
import { useApp, logout } from "../state/Providers";
import { assertOnline } from "../utils/offline";
import { shareText } from "../utils/trips";
import { open, telHref } from "./common";
import type { Booking, Config, Document, Notice as Note, Profile, Vehicle } from "../types";

const docState = (d: Document) =>
  d.expiryDate && new Date(d.expiryDate).getTime() < Date.now() ? "EXPIRED" : d.expiryDate && new Date(d.expiryDate).getTime() < Date.now() + 30 * 86400000 ? "EXPIRING_SOON" : null;

export function MoreScreen() {
  const q = useDriver<Profile>("profile"), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const p = q.data;
  const docs = p?.documents || [];
  const docsOk = docs.length > 0 && docs.every((d) => d.status === "VERIFIED" && !docState(d));
  const docsAlert = docs.some((d) => docState(d));
  const vehicle = p?.vehicles[0];
  async function signOut() {
    setBusy(true);
    await logout().catch(() => setError("Signed out on this device. Server session revocation could not be confirmed."));
    setBusy(false);
  }
  const details: [React.ComponentProps<typeof Ionicons>["name"], string][] = p
    ? [
        ["call-outline", p.user.mobile || "Mobile not recorded"],
        ["mail-outline", p.user.email],
        ["card-outline", `Licence ${p.licenseNumber}${p.city ? ` · ${p.city}` : ""}`],
        ...(vehicle ? [["car-sport-outline", `${vehicle.make} ${vehicle.model} · ${vehicle.registrationNumber}`] as [React.ComponentProps<typeof Ionicons>["name"], string]] : []),
      ]
    : [];
  return (
    <Screen title="Profile" refresh={() => void q.refetch()} refreshing={q.isRefetching}>
      <StateView loading={q.isPending} error={q.error} retry={() => void q.refetch()} />
      {p && (
        <FadeIn>
          <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 18, gap: 14, borderWidth: 1, borderColor: colors.border, ...shadow }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <Avatar name={`${p.firstName} ${p.lastName}`} size={70} ring />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ fontSize: 22, fontWeight: "900", color: colors.text, letterSpacing: -0.3 }} numberOfLines={1}>{p.firstName} {p.lastName}</Text>
                <Text style={{ fontSize: 13, color: colors.muted, fontWeight: "700" }}>Driver ID · {p.id.slice(-8).toUpperCase()}</Text>
                <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
                  <RecordBadge value={p.status} />
                  <Badge label={p.user.isVerified ? "Verified" : "Verification pending"} tone={p.user.isVerified ? "green" : "amber"} icon={p.user.isVerified ? "shield-checkmark" : "time-outline"} />
                </View>
              </View>
            </View>
            <View style={{ backgroundColor: "#FFFFFFCC", borderRadius: 16, padding: 12, gap: 8 }}>
              {details.map(([icon, text]) => (
                <View key={icon} style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                  <Ionicons name={icon} size={17} color={colors.muted} />
                  <Text style={{ flex: 1, fontSize: 14, color: colors.text, fontWeight: "600" }} numberOfLines={1}>{text}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </FadeIn>
      )}
      <SectionTitle title="Operations" icon="briefcase-outline" tone="red" />
      <Card style={{ gap: 0, paddingVertical: 6 }}>
        <ListRow icon="car-sport-outline" tone="blue" title="My Vehicle" subtitle={vehicle ? vehicle.registrationNumber : "Assigned vehicle"} onPress={() => router.push("/vehicle")} />
        <ListRow
          icon="document-text-outline"
          tone={docsAlert ? "red" : "green"}
          title="My Documents"
          subtitle="Status and expiry dates"
          right={docsAlert ? <Badge label="Action needed" tone="red" /> : docsOk ? <Badge label="Verified" tone="green" icon="checkmark" /> : undefined}
          onPress={() => router.push("/documents")}
        />
        <ListRow icon="wallet-outline" tone="green" title="Earnings" subtitle="Trips, payouts and incentives" onPress={() => router.push("/earnings")} />
        <ListRow icon="shield-checkmark-outline" tone="red" title="Safety" subtitle="Emergency and sharing tools" last onPress={() => router.push("/safety")} />
      </Card>
      <SectionTitle title="Account" icon="person-circle-outline" tone="blue" />
      <Card style={{ gap: 0, paddingVertical: 6 }}>
        <ListRow icon="notifications-outline" tone="amber" title="Notifications" subtitle="Trip and account updates" onPress={() => router.push("/notifications")} />
        <ListRow icon="lock-closed-outline" title="Security & Password" subtitle="Password reset and sessions" last onPress={() => router.push("/security")} />
      </Card>
      <SectionTitle title="Support" icon="headset-outline" tone="green" />
      <Card style={{ gap: 0, paddingVertical: 6 }}>
        <ListRow icon="help-buoy-outline" tone="green" title="Help & Support" subtitle="Call or email RideGrid Operations" last onPress={() => router.push("/support")} />
      </Card>
      <Label small muted center>Contact Operations to update your profile or licence details.</Label>
      {!!error && <Notice tone="amber" text={error} />}
      <View style={{ marginTop: 6 }}>
        <Button title="Log Out" icon="log-out-outline" variant="outline" busy={busy} onPress={() => void signOut()} />
      </View>
    </Screen>
  );
}

export function NotificationsScreen() {
  const q = useDriver<Note[]>("notifications", "", true), { online } = useApp(), [busy, setBusy] = useState<string | null>(null), [error, setError] = useState("");
  const client = useQueryClient();
  async function mark(id: string) {
    setBusy(id);
    try { assertOnline(online); await post("/api/mobile/driver/notifications", { id }); await client.invalidateQueries({ queryKey: ["driver"] }); }
    catch (e) { setError(e instanceof Error ? e.message : "Please retry."); }
    finally { setBusy(null); }
  }
  return (
    <Screen title="Notifications" scroll={false}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 10 }}>
        <StateView loading={q.isPending} error={q.error} retry={() => void q.refetch()} />
        {!!error && <Notice tone="red" text={error} />}
      </View>
      <FlatList
        data={q.data || []}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={colors.brand} colors={[colors.brand]} />}
        ListEmptyComponent={!q.isPending && !q.error ? <StateView empty emptyIcon="notifications-off-outline" emptyTitle="You're all caught up" emptyText="Trip and account updates will appear here." /> : null}
        renderItem={({ item: n }) => (
          <Card style={!n.readAt ? { borderColor: colors.brandSoft, backgroundColor: "#FFFBFB" } : undefined}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, marginTop: 6, backgroundColor: n.readAt ? "transparent" : colors.brand }} />
              <View style={{ flex: 1, gap: 4 }}>
                <Label bold>{n.title}</Label>
                <Label>{n.message}</Label>
                <Label small muted>{dateTime(n.createdAt)}</Label>
              </View>
            </View>
            {(n.target?.type === "booking" || !n.readAt) && (
              <View style={{ flexDirection: "row", gap: 10 }}>
                {n.target?.type === "booking" && (
                  <View style={{ flex: 1 }}>
                    <Button
                      compact
                      title="Open trip"
                      onPress={() => { if (!n.readAt && online) void mark(n.id); router.push({ pathname: "/trip", params: { id: n.target!.id } }); }}
                    />
                  </View>
                )}
                {!n.readAt && (
                  <View style={{ flex: 1 }}>
                    <Button compact variant="secondary" title="Mark read" disabled={!online || busy !== null} onPress={() => void mark(n.id)} />
                  </View>
                )}
              </View>
            )}
          </Card>
        )}
      />
    </Screen>
  );
}

export function VehicleScreen() {
  const q = useDriver<Vehicle[]>("vehicle");
  return (
    <Screen title="My Vehicle" refresh={() => void q.refetch()} refreshing={q.isRefetching}>
      <StateView loading={q.isPending} error={q.error} empty={q.data?.length === 0} emptyIcon="car-outline" emptyTitle="No vehicle assigned" emptyText="Your partner assigns vehicles. Contact Operations if this looks wrong." retry={() => void q.refetch()} />
      {q.data?.map((v) => (
        <Card key={v.id}>
          <VehicleRow vehicle={v} />
          <ListRow icon="business-outline" title={v.vendor.companyName} subtitle="Partner" last />
        </Card>
      ))}
    </Screen>
  );
}

export function DocumentsScreen() {
  const q = useDriver<Document[]>("documents");
  const count = (fn: (d: Document) => boolean) => (q.data || []).filter(fn).length;
  return (
    <Screen title="My Documents" refresh={() => void q.refetch()} refreshing={q.isRefetching}>
      <StateView loading={q.isPending} error={q.error} empty={q.data?.length === 0} emptyIcon="document-text-outline" emptyTitle="No documents recorded" emptyText="Your partner or Operations records your documents." retry={() => void q.refetch()} />
      {!!q.data?.length && (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <StatCard label="Verified" value={String(count((d) => d.status === "VERIFIED" && !docState(d)))} icon="shield-checkmark" tone="green" />
          <StatCard label="Pending" value={String(count((d) => !docState(d) && recordTone(d.status) === "amber"))} icon="time" tone="amber" />
          <StatCard label="Need attention" value={String(count((d) => !!docState(d) || recordTone(d.status) === "red"))} icon="alert-circle" tone="red" />
        </View>
      )}
      {q.data?.map((d, i) => {
        const alert = docState(d);
        const tone = alert ? "red" : recordTone(d.status);
        return (
          <FadeIn key={d.id} delay={i * 40}>
            <Card style={[{ flexDirection: "row", alignItems: "center", gap: 14, borderLeftWidth: 4, borderLeftColor: tones[tone].fg }, alert ? { backgroundColor: colors.brandTint } : null]}>
              <IconTile icon={alert ? "warning" : tone === "green" ? "document-text" : "document-text-outline"} tone={tone} size={50} />
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text }}>{d.documentType.replaceAll("_", " ")}</Text>
                <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                  <Ionicons name="calendar-outline" size={14} color={alert ? colors.brand : colors.muted} />
                  <Text style={{ flex: 1, fontSize: 13.5, color: alert ? colors.brand : colors.muted, fontWeight: alert ? "800" : "500" }}>{d.expiryDate ? `Expires ${dateTime(d.expiryDate)}` : "No expiry recorded"}</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                  <RecordBadge value={d.status} />
                  {alert && <RecordBadge value={alert} />}
                </View>
              </View>
            </Card>
          </FadeIn>
        );
      })}
      <Notice tone="grey" title="Need a change?" text="Document submissions and updates are handled by your partner or Operations. Full ID numbers and document files are not displayed here." onPress={() => router.push("/support")} />
    </Screen>
  );
}

export function SafetyScreen({ supportOnly = false }: { supportOnly?: boolean }) {
  const { id } = useLocalSearchParams<{ id?: string }>(), q = useDriver<Config>("config"), [error, setError] = useState("");
  async function shareTrip() {
    try { const b = await api<Booking>(`/api/mobile/driver/trips?id=${encodeURIComponent(id!)}`); await Share.share({ message: shareText(b) }); }
    catch (e) { setError(e instanceof Error ? e.message : "Sharing failed."); }
  }
  async function shareLocation() {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error("Location permission is required to share your position.");
      const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await Share.share({ message: `My current location: https://www.google.com/maps?q=${p.coords.latitude},${p.coords.longitude}` });
    } catch (e) { setError(e instanceof Error ? e.message : "Sharing failed."); }
  }
  const c = q.data;
  return (
    <Screen title={supportOnly ? "Help & Support" : "Safety"}>
      {!supportOnly && (
        <View style={{ alignItems: "center", gap: 8, paddingVertical: 8 }}>
          <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="shield-checkmark" size={44} color={colors.brand} />
          </View>
          <Text style={{ fontSize: 20, fontWeight: "800", color: colors.text, textAlign: "center" }}>Stop somewhere safe before using your phone.</Text>
        </View>
      )}
      <Notice tone="grey" text="These actions open your phone or share sheet. RideGrid does not provide emergency monitoring through this app." />
      <StateView loading={q.isPending} error={q.error} retry={() => void q.refetch()} />
      {c && !supportOnly && (
        c.emergencyPhone
          ? <Button title="Call emergency number" icon="call" variant="danger" onPress={() => void open(telHref(c.emergencyPhone!))} />
          : <Notice tone="red" icon="warning-outline" text="No emergency number has been configured. Use your phone’s emergency calling function if needed." />
      )}
      {c && (
        <>
          <SectionTitle title={supportOnly ? "Contact Operations" : "RideGrid support"} />
          <Card style={{ gap: 0, paddingVertical: 4 }}>
            <ListRow icon="call-outline" title="Call RideGrid support" onPress={() => void open(c.support.phoneHref)} />
            <ListRow
              icon="mail-outline"
              title="Email Operations"
              last={!c.support.whatsapp}
              onPress={() => void open(c.support.emailHref + (id ? `?subject=${encodeURIComponent(`Driver trip support: ${id}`)}` : ""))}
            />
            {!!c.support.whatsapp && <ListRow icon="logo-whatsapp" title="WhatsApp support" tone="green" last onPress={() => void open(c.support.whatsapp)} />}
          </Card>
        </>
      )}
      {(id || !supportOnly) && (
        <Card style={{ gap: 0, paddingVertical: 4 }}>
          {id && <ListRow icon="share-social-outline" title="Share trip details" last={supportOnly} onPress={() => void shareTrip()} />}
          {!supportOnly && <ListRow icon="locate-outline" title="Share my current location" last onPress={() => void shareLocation()} />}
        </Card>
      )}
      {!!error && <Notice tone="red" text={error} />}
    </Screen>
  );
}

export function SecurityScreen() {
  return (
    <Screen title="Security">
      <Notice tone="green" icon="lock-closed-outline" text="Sessions are stored in your device’s secure storage. Your password is never saved." />
      <Card style={{ gap: 0, paddingVertical: 4 }}>
        <ListRow icon="key-outline" title="Reset password by email" subtitle="Recovery uses your registered email address." last onPress={() => router.push("/forgot-password")} />
      </Card>
    </Screen>
  );
}

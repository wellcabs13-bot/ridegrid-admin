import React, { useState } from "react";
import { FlatList, RefreshControl, Share, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { Avatar, Badge, Button, Card, colors, dateTime, Label, ListRow, Notice, RecordBadge, Screen, SectionTitle, StateView, VehicleRow } from "../components/ui";
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
  async function signOut() {
    setBusy(true);
    await logout().catch(() => setError("Signed out on this device. Server session revocation could not be confirmed."));
    setBusy(false);
  }
  return (
    <Screen title="Profile" refresh={() => void q.refetch()} refreshing={q.isRefetching}>
      <StateView loading={q.isPending} error={q.error} retry={() => void q.refetch()} />
      {p && (
        <Card style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Avatar name={`${p.firstName} ${p.lastName}`} size={64} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontSize: 20, fontWeight: "800", color: colors.text }}>{p.firstName} {p.lastName}</Text>
            <Label small muted>{p.user.mobile || p.user.email}</Label>
            <Label small muted>Licence {p.licenseNumber}{p.city ? ` · ${p.city}` : ""}</Label>
            <View style={{ flexDirection: "row", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
              <RecordBadge value={p.status} />
              <Badge label={p.user.isVerified ? "Verified" : "Verification pending"} tone={p.user.isVerified ? "green" : "amber"} />
            </View>
          </View>
        </Card>
      )}
      <Card style={{ gap: 0, paddingVertical: 4 }}>
        <ListRow icon="car-outline" title="My Vehicle" onPress={() => router.push("/vehicle")} />
        <ListRow
          icon="document-text-outline"
          title="My Documents"
          right={docsAlert ? <Badge label="Action needed" tone="red" /> : docsOk ? <Badge label="Verified" tone="green" /> : undefined}
          onPress={() => router.push("/documents")}
        />
        <ListRow icon="wallet-outline" title="Earnings" onPress={() => router.push("/earnings")} />
        <ListRow icon="notifications-outline" title="Notifications" onPress={() => router.push("/notifications")} />
        <ListRow icon="lock-closed-outline" title="Security & Password" last onPress={() => router.push("/security")} />
      </Card>
      <Card style={{ gap: 0, paddingVertical: 4 }}>
        <ListRow icon="shield-checkmark-outline" title="Safety" tone="red" onPress={() => router.push("/safety")} />
        <ListRow icon="headset-outline" title="Help & Support" last onPress={() => router.push("/support")} />
      </Card>
      <Label small muted center>Contact Operations to update your profile or licence details.</Label>
      {!!error && <Notice tone="amber" text={error} />}
      <Button title="Log Out" icon="log-out-outline" variant="secondary" busy={busy} onPress={() => void signOut()} />
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
  return (
    <Screen title="My Documents" refresh={() => void q.refetch()} refreshing={q.isRefetching}>
      <StateView loading={q.isPending} error={q.error} empty={q.data?.length === 0} emptyIcon="document-text-outline" emptyTitle="No documents recorded" emptyText="Your partner or Operations records your documents." retry={() => void q.refetch()} />
      {q.data?.map((d) => {
        const alert = docState(d);
        return (
          <Card key={d.id} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: alert ? colors.brandSoft : colors.greySoft, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="document-text-outline" size={22} color={alert ? colors.brand : colors.text} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Label bold>{d.documentType.replaceAll("_", " ")}</Label>
              <Label small muted>{d.expiryDate ? `Expires ${dateTime(d.expiryDate)}` : "No expiry recorded"}</Label>
              <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                <RecordBadge value={d.status} />
                {alert && <RecordBadge value={alert} />}
              </View>
            </View>
          </Card>
        );
      })}
      <Notice tone="grey" text="Document submissions and updates are handled by your partner or Operations. Full ID numbers and document files are not displayed here." onPress={() => router.push("/support")} />
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

import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Avatar, Badge, Card, colors, FadeIn, ListRow, Menu, Notice, Screen, shortId } from "../components/ui";
import { useVendor } from "../services/vendor";
import { logout } from "../state/Providers";
import type { Profile } from "../types";

export default function More() {
  const q = useVendor<Profile>("profile"),
    n = useVendor<{ unread: number }>("notifications", "?page=1"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    p = q.data;
  const unread = n.data?.unread || 0;
  async function signOut() {
    setBusy(true);
    try {
      await logout();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Signed out on this device.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen title="More" refresh={() => { q.refetch(); n.refetch(); }} refreshing={q.isRefetching}>
      {p && (
        <FadeIn>
          <Card onPress={() => router.push("/profile")} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 }}>
            <Avatar name={p.companyName} size={52} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 16.5, fontWeight: "900", color: colors.text }} numberOfLines={1}>{p.companyName}</Text>
              <Text style={{ fontSize: 12.5, color: colors.muted, fontWeight: "600" }}>Vendor ID: {shortId(p.id)}</Text>
            </View>
            <Badge value={p.standing?.state === "SUSPENDED" ? "SUSPENDED" : p.isApproved ? "VERIFIED" : "VERIFICATION_PENDING"} />
            <Ionicons name="chevron-forward" size={18} color={colors.faint} />
          </Card>
        </FadeIn>
      )}
      <Menu>
        <ListRow
          icon="notifications"
          tone="grey"
          title="Notifications"
          right={unread > 0 ? <View style={{ minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }}><Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 11.5 }}>{unread > 99 ? "99+" : unread}</Text></View> : undefined}
          onPress={() => router.push("/notifications")}
        />
        <ListRow icon="car-sport-outline" title="Vehicle Management" onPress={() => router.push("/fleet")} />
        <ListRow icon="people-outline" title="Driver Management" onPress={() => router.push("/drivers")} />
        <ListRow icon="today-outline" title="Availability" onPress={() => router.push("/availability")} />
        <ListRow icon="wallet-outline" title="Earnings" onPress={() => router.push("/earnings")} />
        <ListRow icon="pricetags-outline" title="Vendor Pricing" onPress={() => router.push("/pricing")} />
        <ListRow icon="document-text-outline" title="Documents" onPress={() => router.push("/profile")} />
        <ListRow icon="help-circle-outline" title="Help & Support" onPress={() => router.push("/support")} />
        <ListRow icon="lock-closed-outline" title="Security & Password" last onPress={() => router.push("/forgot-password")} />
      </Menu>
      {!!error && <Notice tone="amber" text={error} />}
      <Card style={{ paddingVertical: 4 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Logout"
          disabled={busy}
          onPress={() => void signOut()}
          style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 56, paddingHorizontal: 4 }, pressed && { opacity: 0.7 }]}
        >
          <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
            {busy ? <ActivityIndicator color={colors.brand} /> : <Ionicons name="log-out-outline" size={22} color={colors.brand} />}
          </View>
          <Text style={{ fontSize: 17, fontWeight: "800", color: colors.brand }}>Logout</Text>
        </Pressable>
      </Card>
    </Screen>
  );
}

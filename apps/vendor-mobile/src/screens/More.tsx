import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Avatar, Badge, Button, colors, FadeIn, gradients, ListRow, Menu, Notice, Screen, SectionTitle, shadow, shortId } from "../components/ui";
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
  return (
    <Screen title="More" refresh={() => { q.refetch(); n.refetch(); }} refreshing={q.isRefetching}>
      {p && (
        <FadeIn>
          <LinearGradient colors={gradients.soft} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 18, flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderColor: colors.border, ...shadow }}>
            <Avatar name={p.companyName} size={64} ring />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ fontSize: 19, fontWeight: "900", color: colors.text }} numberOfLines={2}>{p.companyName}</Text>
              <Text style={{ fontSize: 13, color: colors.muted, fontWeight: "700" }}>Vendor ID · {shortId(p.id)}</Text>
              <Badge value={p.standing?.state === "SUSPENDED" ? "SUSPENDED" : p.isApproved ? "VERIFIED" : "VERIFICATION_PENDING"} />
            </View>
          </LinearGradient>
        </FadeIn>
      )}
      <SectionTitle title="Fleet" icon="car-sport-outline" tone="red" />
      <Menu>
        <ListRow icon="car-sport-outline" tone="blue" title="Vehicles" subtitle="Fleet, status and documents" onPress={() => router.push("/fleet")} />
        <ListRow icon="people-outline" tone="green" title="Drivers" subtitle="Drivers, alignment and documents" onPress={() => router.push("/drivers")} />
        <ListRow icon="today-outline" tone="amber" title="Availability" subtitle="Vehicles and drivers by date" last onPress={() => router.push("/availability")} />
      </Menu>
      <SectionTitle title="Business" icon="briefcase-outline" tone="green" />
      <Menu>
        <ListRow icon="wallet-outline" tone="green" title="Earnings & Settlements" subtitle="Wallet, settlements and trip earnings" onPress={() => router.push("/earnings")} />
        <ListRow icon="pricetags-outline" tone="red" title="Vendor Pricing" subtitle="Submit rates for approval" onPress={() => router.push("/pricing")} />
        <ListRow icon="document-text-outline" tone="blue" title="Business Documents" subtitle="Profile documents and verification" last onPress={() => router.push("/profile")} />
      </Menu>
      <SectionTitle title="Account" icon="person-circle-outline" tone="blue" />
      <Menu>
        <ListRow
          icon="notifications-outline"
          tone="amber"
          title="Notifications"
          right={unread > 0 ? <View style={{ minWidth: 24, height: 24, borderRadius: 12, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }}><Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 12 }}>{unread > 99 ? "99+" : unread}</Text></View> : undefined}
          onPress={() => router.push("/notifications")}
        />
        <ListRow icon="business-outline" title="Business Profile" subtitle="Company, contact and address" onPress={() => router.push("/profile")} />
        <ListRow icon="lock-closed-outline" title="Security & Password" subtitle="Password recovery and reset" last onPress={() => router.push("/forgot-password")} />
      </Menu>
      <SectionTitle title="Support" icon="headset-outline" tone="green" />
      <Menu>
        <ListRow icon="help-buoy-outline" tone="green" title="Help & Support" subtitle="Call, email or WhatsApp Operations" last onPress={() => router.push("/support")} />
      </Menu>
      {!!error && <Notice tone="amber" text={error} />}
      <View style={{ marginTop: 6 }}>
        <Button
          title="Log Out"
          icon="log-out-outline"
          variant="outline"
          busy={busy}
          onPress={async () => {
            setBusy(true);
            try {
              await logout();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Signed out on this device.");
            } finally {
              setBusy(false);
            }
          }}
        />
      </View>
    </Screen>
  );
}

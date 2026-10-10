import { MenuRow, Badge, Avatar, Divider, SectionHeader } from "../../src/components/Premium";
import { useState } from "react";
import { Pressable, Text, Linking, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api, baseURL } from "../../src/services/api";
import { useApp, logout } from "../../src/state/Providers";
import type { Config, NoticePage, Profile } from "../../src/types";
import {
  Screen,
  Card,
  Button,
  ErrorText,
  SignedIn,
  styles,
  theme,
} from "../../src/components/ui";
export default function Account() {
  const { session, online } = useApp();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const profile = useQuery({
    queryKey: ["profile", session?.user.id],
    enabled: !!session,
    queryFn: ({ signal }) => api<Profile>("/api/mobile/profile", { signal }),
  });
  const q = useQuery({
    queryKey: ["config"],
    queryFn: () => api<Config>("/api/mobile/config", {}, false),
  });
  // Same cached query the tab bar uses for its unread badge.
  const inbox = useQuery({
    queryKey: ["notifications", session?.user.id, 1],
    queryFn: () => api<NoticePage>("/api/mobile/notifications"),
    enabled: !!session,
  });
  async function signOut() {
    setBusy(true);
    setError("");
    try {
      await logout();
      router.replace("/(tabs)");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const open = (path?: string) => void Linking.openURL(`${baseURL}${path}`);
  return (
    <Screen title="Profile" subtitle="Your account, trips and support.">
      <SignedIn>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit personal information"
          onPress={() => router.push("/profile")}
          style={({ pressed }) => [
            styles.card,
            { flexDirection: "row", alignItems: "center", gap: 14 },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Avatar name={session?.user.name || "R"} size={62} />
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={[styles.heading, { fontSize: 19 }]} numberOfLines={1}>
              {session?.user.name}
            </Text>
            <Text style={styles.small} numberOfLines={1}>
              {session?.user.email}
            </Text>
            {profile.data?.user.isVerified && (
              <Badge text="Verified account" tone="green" icon="shield-checkmark" />
            )}
          </View>
          <Text style={{ color: theme.brand, fontWeight: "700", fontSize: 13 }}>Edit</Text>
        </Pressable>
        <Card>
          <MenuRow icon="car-outline" title="My Trips" subtitle="View and manage your bookings" onPress={() => router.push("/(tabs)/trips")} />
          <Divider />
          <MenuRow icon="wallet-outline" tint={theme.success} title="Wallet & Rewards" subtitle="Loyalty points and payments" onPress={() => router.push("/rewards")} />
          <Divider />
          <MenuRow icon="bookmark-outline" tint={theme.purple} title="Saved Routes" subtitle="Favourite journeys and fare watches" onPress={() => router.push("/saved-routes")} />
          <Divider />
          <MenuRow icon="sparkles-outline" tint={theme.blue} title="RideGuide Planner" subtitle="Guided trip planning" onPress={() => router.push("/assistant")} />
          <Divider />
          <MenuRow
            icon="notifications-outline"
            title="Notifications"
            subtitle="Booking and account updates"
            badge={inbox.data?.unread ? String(inbox.data.unread) : undefined}
            onPress={() => router.push("/(tabs)/notifications")}
          />
        </Card>
      </SignedIn>
      <SectionHeader title="Security & support" />
      <Card>
        {session && (
          <>
            <MenuRow icon="lock-closed-outline" tint={theme.ink} title="Password & security" onPress={() => router.push("/security")} />
            <Divider />
          </>
        )}
        <MenuRow icon="shield-checkmark-outline" tint={theme.success} title="Safety Center" subtitle="Your safety, our priority" onPress={() => router.push("/safety")} />
        <Divider />
        <MenuRow icon="headset-outline" tint={theme.blue} title="Help & Support" subtitle="Get help with your trip" onPress={() => router.push("/support")} />
        <Divider />
        <MenuRow icon="document-text-outline" tint={theme.ink} title="Terms & conditions" onPress={() => q.data && open(q.data.termsPath)} />
        <Divider />
        <MenuRow icon="eye-off-outline" tint={theme.ink} title="Privacy policy" onPress={() => q.data && open(q.data.privacyPath)} />
        {session && (
          <>
            <Divider />
            <MenuRow
              icon="trash-outline"
              title="Delete my account"
              onPress={() => q.data && open(q.data.accountDeletionPath || "/account-deletion")}
            />
          </>
        )}
      </Card>
      <ErrorText error={error || q.error} />
      {/* Signing out clears this device immediately, online or not; the server
          session is revoked when a connection is available. */}
      {session && (
        <Button title="Sign Out" icon="log-out-outline" outline onPress={() => void signOut()} busy={busy} />
      )}
      {session && !online && (
        <Text style={styles.small}>Offline: you will be signed out on this device now.</Text>
      )}
      <Text style={[styles.small, { textAlign: "center" }]}>RideGrid Customer · Version 1.0.0</Text>
    </Screen>
  );
}

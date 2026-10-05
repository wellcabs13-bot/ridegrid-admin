import { MenuRow, Badge, Avatar, SectionHeader } from "../../src/components/Premium";
import { useState } from "react";
import { Text, Linking, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api, baseURL } from "../../src/services/api";
import { useApp, logout } from "../../src/state/Providers";
import type { Config, Profile } from "../../src/types";
import {
  Screen,
  Card,
  Button,
  ErrorText,
  SignedIn,
  styles,
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
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <Avatar name={session?.user.name || "R"} size={60} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.heading} numberOfLines={1}>
                {session?.user.name}
              </Text>
              <Text style={styles.small} numberOfLines={1}>
                {session?.user.email}
              </Text>
              {profile.data?.user.isVerified && (
                <Badge text="Verified account" tone="green" icon="shield-checkmark" />
              )}
            </View>
          </View>
          <Button title="Personal information" secondary onPress={() => router.push("/profile")} />
        </Card>
        <SectionHeader title="My RideGrid" />
        <Card>
          <MenuRow icon="car-outline" title="My trips" subtitle="View and manage your bookings" onPress={() => router.push("/(tabs)/trips")} />
          <MenuRow icon="bookmark-outline" title="Saved routes & fare watches" onPress={() => router.push("/saved-routes")} />
          <MenuRow icon="gift-outline" title="Loyalty rewards" onPress={() => router.push("/rewards")} />
          <MenuRow icon="compass-outline" title="RideGuide" subtitle="Guided trip planning" onPress={() => router.push("/assistant")} />
          <MenuRow icon="notifications-outline" title="Notifications" onPress={() => router.push("/(tabs)/notifications")} />
        </Card>
      </SignedIn>
      <SectionHeader title="Security & support" />
      <Card>
        {session && (
          <MenuRow icon="lock-closed-outline" title="Password & security" onPress={() => router.push("/security")} />
        )}
        <MenuRow icon="shield-checkmark-outline" title="Safety" onPress={() => router.push("/safety")} />
        <MenuRow icon="headset-outline" title="Help & support" onPress={() => router.push("/support")} />
        <MenuRow icon="document-text-outline" title="Terms & conditions" onPress={() => q.data && open(q.data.termsPath)} />
        <MenuRow icon="eye-off-outline" title="Privacy policy" onPress={() => q.data && open(q.data.privacyPath)} />
        {session && (
          <MenuRow
            icon="trash-outline"
            title="Delete my account"
            onPress={() => q.data && open(q.data.accountDeletionPath || "/account-deletion")}
          />
        )}
      </Card>
      <Text style={[styles.small, { textAlign: "center" }]}>RideGrid Customer · Version 1.0.0</Text>
      <ErrorText error={error || q.error} />
      {/* Signing out clears this device immediately, online or not; the server
          session is revoked when a connection is available. */}
      {session && <Button title="Sign out" secondary onPress={() => void signOut()} busy={busy} />}
      {session && !online && (
        <Text style={styles.small}>Offline: you will be signed out on this device now.</Text>
      )}
    </Screen>
  );
}

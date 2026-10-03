import { MenuRow, Badge } from "../../src/components/Premium";
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
  return (
    <Screen
      title="Your account"
      subtitle="Everything you need for a smoother journey."
    >
      <SignedIn>
        <Card>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              borderWidth: 1,
              borderColor: theme.brand,
              backgroundColor: theme.brandDark,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={[styles.title, { color: theme.ink }]}>
              {session?.user.name?.slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.heading}>{session?.user.name}</Text>
          <Text style={styles.small}>{session?.user.email}</Text>
          {profile.data?.user.isVerified && (
            <Badge
              text="Verified account"
              tone="green"
              icon="shield-checkmark-outline"
            />
          )}
          <MenuRow
            icon="car-outline"
            title="My Bookings"
            onPress={() => router.push("/(tabs)/trips")}
          />
          <MenuRow
            icon="bookmark-outline"
            title="Saved Routes & Fare Watches"
            onPress={() => router.push("/saved-routes")}
          />
          <MenuRow
            icon="gift-outline"
            title="Loyalty Rewards"
            onPress={() => router.push("/rewards")}
          />
          <MenuRow
            icon="notifications-outline"
            title="Notifications"
            onPress={() => router.push("/(tabs)/notifications")}
          />
          <MenuRow
            icon="shield-checkmark-outline"
            title="Safety & support"
            onPress={() => router.push("/safety")}
          />
          <MenuRow
            icon="sparkles-outline"
            title="Trip Assistant"
            onPress={() => router.push("/assistant")}
          />
          <Button
            title="Personal information"
            secondary
            onPress={() => router.push("/profile")}
          />
          <Button
            title="Password & security"
            secondary
            onPress={() => router.push("/security")}
          />
        </Card>
      </SignedIn>
      <Card>
        <Button
          title="Help & support"
          secondary
          onPress={() => router.push("/support")}
        />
        <Button
          title="Terms & conditions"
          secondary
          disabled={!q.data}
          onPress={() => void Linking.openURL(`${baseURL}${q.data?.termsPath}`)}
        />
        <Button
          title="Privacy policy"
          secondary
          disabled={!q.data}
          onPress={() =>
            void Linking.openURL(`${baseURL}${q.data?.privacyPath}`)
          }
        />
        <Text style={styles.small}>RideGrid Customer / Version 1.0.0</Text>
      </Card>
      <ErrorText error={error || q.error} />
      {session && (
        <Button
          title="Sign out"
          onPress={() => void signOut()}
          busy={busy}
          disabled={!online}
        />
      )}
    </Screen>
  );
}

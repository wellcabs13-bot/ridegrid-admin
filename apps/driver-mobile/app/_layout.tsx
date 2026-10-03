import { Tracking } from "../src/state/Tracking";
import React from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Providers, useApp } from "../src/state/Providers";
import { colors } from "../src/components/ui";
function Routes() {
  const { ready, session } = useApp(),
    segments = useSegments(),
    router = useRouter();
  React.useEffect(() => {
    if (!ready) return;
    const auth = ["login", "forgot-password", "reset-password"].includes(
      segments[0] || "",
    );
    if (!session && !auth) router.replace("/login");
    if (session && segments[0] === "login") router.replace("/");
  }, [ready, session, segments]);
  if (!ready) return null;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
export default function Layout() {
  return (
    <SafeAreaProvider>
      <Providers>
        <StatusBar style="light" />
        <Tracking><Routes /></Tracking>
      </Providers>
    </SafeAreaProvider>
  );
}



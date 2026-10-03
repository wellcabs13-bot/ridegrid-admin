import React from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Providers, useApp } from "../src/state/Providers";
import { colors } from "../src/components/ui";

const PUBLIC = ["login", "forgot-password", "reset-password"];
function Routes() {
  const { ready, session } = useApp();
  const segments = useSegments();
  const router = useRouter();
  React.useEffect(() => {
    if (!ready) return;
    const open = PUBLIC.includes(segments[0] || "");
    if (!session && !open) router.replace("/login");
    if (session && segments[0] === "login") router.replace("/");
  }, [ready, session, segments]);
  if (!ready) return null;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />;
}
export default function Layout() {
  return (
    <SafeAreaProvider>
      <Providers>
        <StatusBar style="light" />
        <Routes />
      </Providers>
    </SafeAreaProvider>
  );
}

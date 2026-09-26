import { Tabs, router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Brand } from "../../src/components/Premium";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../src/services/api";
import { useApp } from "../../src/state/Providers";
import { theme } from "../../src/components/ui";
import type { NoticePage } from "../../src/types";
export default function Layout() {
  const insets = useSafeAreaInsets();
  const { session } = useApp();
  const inbox = useQuery({
    queryKey: ["notifications", session?.user.id, 1],
    queryFn: () => api<NoticePage>("/api/mobile/notifications"),
    enabled: !!session,
    refetchInterval: 60000,
  });
  return (
    <Tabs
      screenOptions={{
        headerTitle: () => <Brand />,
        headerRight: () => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open account"
            onPress={() => router.push("/(tabs)/account")}
            style={{
              width: 44,
              height: 44,
              marginRight: 12,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                backgroundColor: theme.brandDark,
                borderColor: theme.brand,
                borderWidth: 1,
                width: 34,
                height: 34,
                borderRadius: 17,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: theme.ink, fontWeight: "700" }}>
                {session?.user.name?.slice(0, 1).toUpperCase() || "R"}
              </Text>
            </View>
          </Pressable>
        ),
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.paper },
        headerTintColor: theme.ink,
        tabBarActiveTintColor: theme.brand,
        tabBarInactiveTintColor: theme.muted,
        tabBarStyle: {
          backgroundColor: "#000000",
          borderTopColor: theme.line,
          paddingTop: 8,
          height: 64 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        tabBarLabelStyle: { fontSize: 12 },
      }}
    >
      {(["index", "trips", "wallet", "notifications", "account"] as const).map(
        (name, i) => (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              href: name === "wallet" ? null : undefined,
              title: ["Home", "Trips", "Wallet", "Notifications", "Account"][i],
              tabBarLabel: name === "notifications" ? "Updates" : undefined,
              tabBarBadge:
                name === "notifications" && inbox.data?.unread
                  ? inbox.data.unread
                  : undefined,
              tabBarIcon: ({ color, size }) => (
                <Ionicons
                  name={
                    (
                      [
                        "home-outline",
                        "car-outline",
                        "wallet-outline",
                        "notifications-outline",
                        "person-circle-outline",
                      ] as const
                    )[i]
                  }
                  color={color}
                  size={size}
                />
              ),
            }}
          />
        ),
      )}
    </Tabs>
  );
}

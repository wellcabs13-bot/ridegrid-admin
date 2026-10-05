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
type Icon = React.ComponentProps<typeof Ionicons>["name"];
const TABS: { name: string; title: string; icon: Icon; active: Icon; hidden?: boolean }[] = [
  { name: "index", title: "Home", icon: "home-outline", active: "home" },
  { name: "book", title: "Book", icon: "search-outline", active: "search" },
  { name: "trips", title: "Trips", icon: "car-outline", active: "car" },
  { name: "notifications", title: "Updates", icon: "notifications-outline", active: "notifications" },
  { name: "account", title: "Account", icon: "person-outline", active: "person" },
  { name: "wallet", title: "Wallet", icon: "wallet-outline", active: "wallet", hidden: true },
];
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
        headerTitle: "",
        headerLeft: () => (
          <View style={{ marginLeft: 20 }}>
            <Brand />
          </View>
        ),
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
                backgroundColor: theme.ink,
                width: 34,
                height: 34,
                borderRadius: 17,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "white", fontWeight: "700" }}>
                {session?.user.name?.slice(0, 1).toUpperCase() || "R"}
              </Text>
            </View>
          </Pressable>
        ),
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.paper },
        headerTintColor: theme.ink,
        tabBarActiveTintColor: theme.brand,
        tabBarInactiveTintColor: "#98A2B3",
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: theme.line,
          borderTopWidth: 1,
          paddingTop: 8,
          height: 62 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          elevation: 12,
          shadowColor: "#101828",
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -4 },
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            href: t.hidden ? null : undefined,
            title: t.title,
            tabBarBadge:
              t.name === "notifications" && inbox.data?.unread
                ? inbox.data.unread
                : undefined,
            tabBarBadgeStyle: { backgroundColor: theme.brand, color: "white" },
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? t.active : t.icon} color={color} size={size + 1} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

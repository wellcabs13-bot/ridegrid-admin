import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { colors } from "../../src/components/ui";
import { corp } from "../../src/services/api";
import { useApp } from "../../src/state/Providers";
import type { Notice, Page } from "../../src/types";

const TABS = [
  ["index", "Home", "home-outline"],
  ["book", "Book Ride", "car-sport-outline"],
  ["trips", "My Trips", "map-outline"],
  ["notifications", "Updates", "notifications-outline"],
  ["account", "Account", "person-circle-outline"],
] as const;
export default function Layout() {
  const { session } = useApp();
  const unread = useQuery({
    queryKey: ["notifications", session?.user.id, 1],
    queryFn: ({ signal }) => corp<Page<Notice> & { unread: number }>("notifications", "?page=1", signal),
    enabled: !!session,
    refetchInterval: 60000,
  });
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border, minHeight: 64, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
      }}
    >
      {TABS.map(([name, title, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, size }) => <Ionicons name={icon} color={color} size={size} />,
            ...(name === "notifications" && unread.data?.unread ? { tabBarBadge: unread.data.unread > 99 ? "99+" : unread.data.unread } : {}),
          }}
        />
      ))}
    </Tabs>
  );
}

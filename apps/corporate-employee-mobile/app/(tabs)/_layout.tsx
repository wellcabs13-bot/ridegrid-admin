import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../src/components/ui";

// Bottom navigation per the reference: Home, Trips, Book, Approvals, More.
// Updates stay reachable from the Home bell and keep their own route.
const TABS = [
  ["index", "Home", "home"],
  ["trips", "Trips", "car-sport"],
  ["book", "Book", "calendar"],
  ["approvals", "Approvals", "shield-checkmark"],
  ["account", "More", "ellipsis-horizontal"],
] as const;
export default function Layout() {
  const { bottom } = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 60 + bottom, paddingTop: 6, paddingBottom: 6 + bottom, shadowColor: "#111827", shadowOpacity: 0.08, shadowRadius: 10, elevation: 8 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
      }}
    >
      {TABS.map(([name, title, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{ title, tabBarIcon: ({ color, size }) => <Ionicons name={icon} color={color} size={size} /> }}
        />
      ))}
      <Tabs.Screen name="notifications" options={{ title: "Updates", href: null }} />
    </Tabs>
  );
}

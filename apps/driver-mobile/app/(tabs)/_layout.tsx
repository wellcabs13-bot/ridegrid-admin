import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../src/components/ui";
const TABS = [
  ["index", "Home", "home", "home-outline"],
  ["trips", "My Trips", "receipt", "receipt-outline"],
  ["earnings", "Earnings", "wallet", "wallet-outline"],
  ["more", "More", "ellipsis-horizontal-circle", "ellipsis-horizontal-circle-outline"],
] as const;
export default function Layout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.brand, tabBarInactiveTintColor: colors.muted, tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, minHeight: 66, paddingTop: 6 }, tabBarLabelStyle: { fontSize: 12, fontWeight: "700" } }}>
      {TABS.map(([name, title, active, idle]) => (
        <Tabs.Screen key={name} name={name} options={{ title, tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? active : idle} color={color} size={size} /> }} />
      ))}
    </Tabs>
  );
}

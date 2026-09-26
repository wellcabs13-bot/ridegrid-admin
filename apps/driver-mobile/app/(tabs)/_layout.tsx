import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../src/components/ui";
export default function Layout() {
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.brand, tabBarInactiveTintColor: colors.muted, tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border, minHeight: 68, paddingTop: 8 }, tabBarLabelStyle: { fontSize: 11, fontWeight: "700" } }}>
    {([["index", "Home", "home-outline"], ["trips", "Trips", "car-outline"], ["notifications", "Updates", "notifications-outline"], ["account", "Account", "person-outline"]] as const).map(([name, title, icon]) => <Tabs.Screen key={name} name={name} options={{ title, tabBarIcon: ({ color, size }) => <Ionicons name={icon} color={color} size={size} /> }} />)}
  </Tabs>;
}

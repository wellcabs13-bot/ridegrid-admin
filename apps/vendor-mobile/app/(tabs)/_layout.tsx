import { Platform, View } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../src/components/ui";
const TABS = [
  ["index", "Home", "home", "home-outline"],
  ["bookings", "Bookings", "calendar", "calendar-outline"],
  ["fleet", "Vehicles", "car-sport", "car-sport-outline"],
  ["drivers", "Drivers", "person", "person-outline"],
  ["more", "More", "menu", "menu-outline"],
] as const;
export default function Layout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: "#8A8F9C",
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          minHeight: 64,
          paddingTop: 6,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          ...Platform.select({ android: { elevation: 18 }, default: { shadowColor: "#1A1D29", shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: -4 } } }),
        },
        tabBarLabelStyle: { fontSize: 11.5, fontWeight: "700", marginTop: 1 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      {TABS.map(([name, title, active, idle]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, focused }) => (
              <View style={{ alignItems: "center" }}>
                <View style={{ position: "absolute", top: -8, width: 22, height: 3, borderRadius: 2, backgroundColor: focused ? colors.brand : "transparent" }} />
                <Ionicons name={focused ? active : idle} color={color} size={23} />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

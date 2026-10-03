import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../src/components/ui";
export default function Layout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          minHeight: 68,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "700" },
      }}
    >
      {(
        [
          ["index", "Home", "grid-outline"],
          ["bookings", "Bookings", "calendar-outline"],
          ["fleet", "Fleet", "car-outline"],
          ["drivers", "Drivers", "people-outline"],
          ["more", "More", "menu-outline"],
        ] as const
      ).map(([name, title, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={icon} color={color} size={size} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

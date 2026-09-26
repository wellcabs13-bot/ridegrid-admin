import { Text, View } from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { Screen, Card, styles, theme, ErrorText } from "../src/components/ui";
import { MenuRow, Badge } from "../src/components/Premium";
import { useApp } from "../src/state/Providers";
import { api } from "../src/services/api";
import { routeParams } from "../src/utils/routes";
import type { SavedRoute } from "../src/types";
export default function Assistant() {
  const { session } = useApp();
  const q = useQuery({
    queryKey: ["saved-routes", session?.user.id],
    enabled: !!session,
    queryFn: ({ signal }) =>
      api<{ routes: SavedRoute[] }>("/api/mobile/routes", { signal }),
  });
  return (
    <Screen
      title="Your trip assistant"
      subtitle="A little guidance. A lot more freedom."
    >
      <LinearGradient
        colors={[theme.surface, "#1A0F10", theme.paper]}
        style={[styles.card, { alignItems: "center", paddingVertical: 32 }]}
      >
        <Ionicons name="sparkles-outline" size={64} color={theme.brand} />
        <Text style={styles.title}>Meet RideGuide</Text>
        <Badge text="GUIDED PLANNING" tone="gold" />
        <Text style={[styles.subtitle, { textAlign: "center" }]}>
          Plan, compare and manage your journey with real RideGrid information.
        </Text>
        <Text style={[styles.small, { textAlign: "center" }]}>
          Choose an action below. This assistant uses guided actions, without AI
          chat or predictions.
        </Text>
      </LinearGradient>
      <Card>
        <MenuRow
          icon="navigate-outline"
          title="Plan a trip"
          subtitle="Choose a route, dates and vehicle"
          onPress={() => router.push("/search")}
        />
        <MenuRow
          icon="car-sport-outline"
          title="Compare available vehicles"
          subtitle="Search current availability and server fares"
          onPress={() => router.push("/search")}
        />
        <MenuRow
          icon="receipt-outline"
          title="Understand my booking"
          subtitle="Fare breakdown, payment and trip status"
          onPress={() => router.push("/(tabs)/trips")}
        />
        <MenuRow
          icon="repeat-outline"
          title="Book a previous journey again"
          subtitle="Choose a trip, then request a fresh fare"
          onPress={() => router.push("/(tabs)/trips")}
        />
        <MenuRow
          icon="headset-outline"
          title="Talk to support"
          onPress={() => router.push("/support")}
        />
      </Card>
      {!!q.data?.routes.length && (
        <Card>
          <Text style={styles.heading}>From your saved routes</Text>
          {q.data.routes.slice(0, 3).map((r) => (
            <MenuRow
              key={r.id}
              icon="bookmark-outline"
              title={`${r.pickupCity} → ${r.dropCity.replaceAll("|", ", ") || r.packageName}`}
              onPress={() =>
                router.push({ pathname: "/search", params: routeParams(r) })
              }
            />
          ))}
        </Card>
      )}
      <ErrorText error={q.error} />
    </Screen>
  );
}

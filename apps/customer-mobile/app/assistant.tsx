import { Text } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen, Card, styles, ErrorText } from "../src/components/ui";
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
      title="RideGuide"
      subtitle="Guided trip planning with real RideGrid information."
    >
      <Card>
        <Badge text="GUIDED ACTIONS" tone="cyan" icon="compass-outline" />
        <Text style={styles.small}>
          Choose an action below. RideGuide uses guided actions and live RideGrid data, without AI chat or predictions.
        </Text>
      </Card>
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

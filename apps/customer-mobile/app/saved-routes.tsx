import { Text } from "react-native";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Screen,
  SignedIn,
  Card,
  Button,
  Loading,
  ErrorText,
  Empty,
  styles,
} from "../src/components/ui";
import { Badge } from "../src/components/Premium";
import { useApp } from "../src/state/Providers";
import { api, post } from "../src/services/api";
import type { SavedRoute } from "../src/types";
import { routeParams } from "../src/utils/routes";
export default function SavedRoutes() {
  const { session, online } = useApp();
  const client = useQueryClient();
  const q = useQuery({
    queryKey: ["saved-routes", session?.user.id],
    enabled: !!session,
    queryFn: ({ signal }) =>
      api<{ routes: SavedRoute[]; automatedAlerts: boolean }>(
        "/api/mobile/routes",
        { signal },
      ),
  });
  const change = useMutation({
    mutationFn: ({ route, remove }: { route: SavedRoute; remove?: boolean }) =>
      remove
        ? api(`/api/mobile/routes?id=${encodeURIComponent(route.id)}`, {
            method: "DELETE",
          })
        : post("/api/mobile/routes", {
            ...routeParams(route),
            fareWatch: !route.fareWatch,
          }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["saved-routes"] }),
  });
  return (
    <Screen
      title="Your saved routes"
      subtitle="Familiar routes. Fresh possibilities."
      onRefresh={() => void q.refetch()}
      refreshing={q.isRefetching}
    >
      <SignedIn>
        <Card>
          <Badge text="FARE WATCH" tone="gold" />
          <Text style={styles.body}>Keep a route on your radar.</Text>
          <Text style={styles.small}>
            Choose new travel dates to check current prices. Automated price
            alerts are not available yet.
          </Text>
        </Card>
        {q.isPending && <Loading />}
        <ErrorText error={q.error || change.error} />
        {q.isError && (
          <Button title="Retry saved routes" onPress={() => void q.refetch()} />
        )}
        {q.data?.routes.length === 0 && (
          <Empty
            title="Your next favourite route"
            body="Save a route from marketplace results to find it here."
          />
        )}
        {q.data?.routes.map((r) => (
          <Card key={r.id}>
            <Text style={styles.heading}>
              {r.pickupCity} →{" "}
              {r.dropCity.replaceAll("|", " · ") || r.packageName}
            </Text>
            <Text style={styles.small}>
              {r.category} ·{" "}
              {r.serviceType === "LOCAL"
                ? "Local"
                : r.tripType === "ROUNDTRIP"
                  ? "Roundtrip"
                  : "One-way"}
            </Text>
            {r.fareWatch && (
              <Badge text="Watching · Manual price check" tone="gold" />
            )}
            <Button
              title="Choose dates & check fares"
              onPress={() =>
                router.push({ pathname: "/search", params: routeParams(r) })
              }
            />
            <Button
              secondary
              title={r.fareWatch ? "Remove fare watch" : "Watch this fare"}
              disabled={!online}
              busy={change.isPending}
              onPress={() => change.mutate({ route: r })}
            />
            <Button
              secondary
              title="Delete saved route"
              disabled={!online}
              busy={change.isPending}
              onPress={() => change.mutate({ route: r, remove: true })}
            />
          </Card>
        ))}
      </SignedIn>
    </Screen>
  );
}

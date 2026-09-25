import { Linking, Text } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen, Card, Button, ErrorText, styles } from "../src/components/ui";
import { Badge } from "../src/components/Premium";
import { api } from "../src/services/api";
import type { Config } from "../src/types";
export default function Safety() {
  const q = useQuery({
    queryKey: ["config"],
    queryFn: () => api<Config>("/api/mobile/config", {}, false),
  });
  return (
    <Screen title="Safety & support" subtitle="Keep your journey connected.">
      <Card>
        <Badge text="HELP WHEN YOU NEED IT" tone="gold" />
        <Text style={styles.heading}>Contact RideGrid support</Text>
        <Text style={styles.body}>
          Call the configured support team for help with your trip.
        </Text>
        <Button
          title="Call support"
          disabled={!q.data}
          onPress={() => void Linking.openURL(q.data!.support.phoneHref)}
        />
        <ErrorText error={q.error} />
        <Text style={styles.small}>
          RideGrid does not provide emergency monitoring through this app. In an
          emergency, contact your local emergency services directly.
        </Text>
      </Card>
      <Card>
        <Text style={styles.heading}>Let someone know your plans</Text>
        <Text style={styles.body}>
          Open a booking and use Share trip to send your route, vehicle and
          departure details to a person you trust.
        </Text>
        <Button
          secondary
          title="Choose a trip to share"
          onPress={() => router.push("/(tabs)/trips")}
        />
      </Card>
    </Screen>
  );
}

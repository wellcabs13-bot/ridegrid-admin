import { router } from "expo-router";
import { Screen, Empty, Button } from "../src/components/ui";
export default function Missing() {
  return (
    <Screen title="Page not found">
      <Empty
        title="Let's get you moving"
        body="This link is unavailable. You can find your journeys from Home."
      />
      <Button title="Go home" onPress={() => router.replace("/(tabs)")} />
    </Screen>
  );
}

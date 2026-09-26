import { router } from "expo-router";
import { Button, EmptyState, Screen } from "../src/components/ui";
export default function NotFound() {
  return (
    <Screen title="Page not found">
      <EmptyState title="This page is unavailable" body="Return home to continue." icon="compass-outline" />
      <Button title="Go home" onPress={() => router.replace("/")} />
    </Screen>
  );
}

import { Screen, Card, SignedIn } from "../../src/components/ui";
import { MenuRow } from "../../src/components/Premium";
import { router } from "expo-router";
// Hidden tab: the customer wallet is not available (config.wallet is false), so this
// only links to features that genuinely exist.
export default function Wallet() {
  return (
    <Screen title="Payments & rewards" subtitle="Bookings use the payment methods shown at checkout.">
      <SignedIn>
        <Card>
          <MenuRow icon="car-outline" title="My trips" subtitle="Payment status for each booking" onPress={() => router.push("/(tabs)/trips")} />
          <MenuRow icon="gift-outline" title="Loyalty rewards" onPress={() => router.push("/rewards")} />
          <MenuRow icon="bookmark-outline" title="Saved routes" onPress={() => router.push("/saved-routes")} />
        </Card>
      </SignedIn>
    </Screen>
  );
}

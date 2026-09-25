import { Screen, Empty, SignedIn, Button } from "../../src/components/ui";
import { router } from "expo-router";
export default function Wallet() {
  return (
    <Screen title="Wallet">
      <SignedIn>
        <Empty
          title="Customer wallet is not available yet"
          body="Your bookings use the payment methods shown at checkout. Wallet balances and wallet payments are not currently available for customer accounts."
        />
        <Button
          title="View my bookings"
          secondary
          onPress={() => router.push("/(tabs)/trips")}
        />
      </SignedIn>
    </Screen>
  );
}

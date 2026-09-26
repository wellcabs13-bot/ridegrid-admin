import { router } from "expo-router";
import { Screen, Empty, Button } from "../src/components/ui";
export default function PaymentReturn() {
  return (
    <Screen title="Check payment status">
      <Empty
        title="Your booking is the source of truth"
        body="A return link does not confirm a payment. Open your booking to retrieve its status from RideGrid."
      />
      <Button
        title="Open My Trips"
        onPress={() => router.replace("/(tabs)/trips")}
      />
    </Screen>
  );
}

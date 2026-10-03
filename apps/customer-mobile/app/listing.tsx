import {
  VehicleVisual,
  VehicleIdentity,
  PriceDisplay,
} from "../src/components/Premium";
import { Text } from "react-native";
import { router } from "expo-router";
import { useJourney } from "../src/state/Journey";
import { Screen, Card, Button, Empty, styles } from "../src/components/ui";
import { Fare } from "../src/components/Fare";
import { label, money } from "../src/utils/journey";
import { useApp } from "../src/state/Providers";
export default function Listing() {
  const { journey } = useJourney();
  const { online, session } = useApp();
  if (!journey)
    return (
      <Screen title="Choose your ride">
        <Empty
          title="Search for a journey"
          body="Select a live marketplace result to see its details."
        />
        <Button title="Find a ride" onPress={() => router.replace("/(tabs)")} />
      </Screen>
    );
  const { listing: l } = journey;
  return (
    <Screen
      title={`${l.vehicle.make} ${l.vehicle.model}`}
      subtitle={l.vendor?.companyName}
    >
      <VehicleVisual
        photos={l.media?.vehiclePhotos}
        name={`${l.vehicle.make} ${l.vehicle.model}`}
      />
      <Card>
        <VehicleIdentity listing={l} />
        <PriceDisplay value={l.pricing.finalPayable} />
        <Text style={styles.heading}>{label(l.vehicle.category)}</Text>
        <Text style={styles.body}>
          {l.vehicle.seatingCapacity} seats / {label(l.vehicle.fuelType)} /{" "}
          {label(l.vehicle.transmission)}
        </Text>
        <Text style={styles.body}>{l.pricing.packageName}</Text>
        <Text style={styles.small}>
          {l.pricing.includedKm} km included
          {l.pricing.includedHours
            ? ` / ${l.pricing.includedHours} hours included`
            : ""}
        </Text>
        {l.pricing.extraKmRate != null && (
          <Text style={styles.small}>
            Extra km: {money(l.pricing.extraKmRate)}
          </Text>
        )}
        {l.pricing.extraHourRate != null && (
          <Text style={styles.small}>
            Extra hour: {money(l.pricing.extraHourRate)}
          </Text>
        )}
        {l.pricing.driverAllowance != null && (
          <Text style={styles.small}>
            Driver allowance: {money(l.pricing.driverAllowance)}
          </Text>
        )}
      </Card>
      <Fare value={l.pricing.quote} />
      <Text style={styles.small}>
        This is a search estimate. We request a fresh price for your account
        before confirmation.
      </Text>
      <Button
        title={session ? "Book this vehicle" : "Sign in to book"}
        disabled={!online}
        onPress={() => router.push(session ? "/checkout" : "/login")}
      />
    </Screen>
  );
}

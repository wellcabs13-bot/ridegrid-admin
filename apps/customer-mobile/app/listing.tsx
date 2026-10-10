import {
  Divider,
  DriverBlock,
  IconDisc,
  RouteLine,
  VehicleVisual,
  VehicleIdentity,
  VendorBlock,
  SectionHeader,
} from "../src/components/Premium";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { useJourney } from "../src/state/Journey";
import { Screen, Card, Button, Empty, styles, theme } from "../src/components/ui";
import { Fare } from "../src/components/Fare";
import { journeyLabel, label, money } from "../src/utils/journey";
import { formatDate, formatTime } from "../src/utils/when";
import { useApp } from "../src/state/Providers";
export default function Listing() {
  const { journey } = useJourney();
  const { online, session } = useApp();
  if (!journey)
    return (
      <Screen title="Choose your ride">
        <Empty
          icon="search-outline"
          title="Search for a journey"
          body="Select a live marketplace result to see its details."
        />
        <Button title="Find a ride" onPress={() => router.replace("/(tabs)")} />
      </Screen>
    );
  const { listing: l, search } = journey;
  const airport = search.serviceType === "AIRPORT";
  const from = airport && search.airportDirection !== "DROP" ? `${search.pickupCity} airport` : search.pickupCity;
  const to = airport
    ? search.airportDirection === "DROP"
      ? `${search.pickupCity} airport`
      : search.pickupCity
    : search.dropCity.replaceAll("|", ", ") || l.pricing.packageName;
  const kind = airport
    ? journeyLabel("AIRPORT")
    : search.serviceType === "LOCAL"
      ? journeyLabel("LOCAL")
      : search.tripType === "ROUNDTRIP"
        ? journeyLabel("ROUNDTRIP")
        : journeyLabel("ONE_WAY");
  const rates: [string, number | null | undefined][] = [
    ["Extra km", l.pricing.extraKmRate],
    ["Extra hour", l.pricing.extraHourRate],
    ["Driver allowance", l.pricing.driverAllowance],
  ];
  return (
    <Screen
      title={`${l.vehicle.make} ${l.vehicle.model}`}
      header={
        <VehicleVisual
          photos={l.media?.vehiclePhotos}
          name={`${l.vehicle.make} ${l.vehicle.model}`}
        />
      }
      footer={
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View style={{ gap: 1 }}>
              <Text style={styles.small}>Total fare</Text>
              <Text style={{ color: theme.ink, fontSize: 24, fontWeight: "800", letterSpacing: -0.7 }}>
                {money(l.pricing.finalPayable)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title={session ? "Book This Ride" : "Sign in to book"}
                icon="arrow-forward"
                disabled={!online}
                onPress={() => router.push(session ? "/checkout" : "/login")}
              />
            </View>
          </View>
        </>
      }
    >
      <Card>
        <VehicleIdentity listing={l} />
      </Card>
      {(l.driver || l.vendor) && (
        <Card>
          <Text style={[styles.heading, { fontSize: 16 }]}>Your exact driver &amp; vendor</Text>
          <DriverBlock listing={l} />
          {l.driver && l.vendor && <Divider />}
          <VendorBlock listing={l} />
        </Card>
      )}
      <Card>
        <View style={styles.row}>
          <Text style={[styles.heading, { fontSize: 16 }]}>Your journey</Text>
          <Text style={[styles.small, { fontWeight: "700", color: theme.brand }]}>{kind}</Text>
        </View>
        <RouteLine from={from} to={to} fromCaption="Pickup" toCaption={airport ? "Airport" : "Drop-off"} />
        <Divider />
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
            <IconDisc name="calendar" size={36} />
            <View style={{ gap: 1 }}>
              <Text style={[styles.small, { fontSize: 11.5 }]}>Date</Text>
              <Text style={[styles.body, { fontWeight: "700" }]}>{formatDate(search.date)}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
            <IconDisc name="time" size={36} />
            <View style={{ gap: 1 }}>
              <Text style={[styles.small, { fontSize: 11.5 }]}>Pickup time</Text>
              <Text style={[styles.body, { fontWeight: "700" }]}>{formatTime(search.time)}</Text>
            </View>
          </View>
        </View>
      </Card>
      <Card>
        <Text style={[styles.heading, { fontSize: 16 }]}>{label(l.vehicle.category)}</Text>
        <Text style={styles.body}>{l.pricing.packageName}</Text>
        <Text style={styles.small}>
          {l.pricing.includedKm} km included
          {l.pricing.includedHours ? ` · ${l.pricing.includedHours} hours included` : ""}
        </Text>
        {rates
          .filter(([, v]) => v != null)
          .map(([name, v]) => (
            <View key={name} style={styles.row}>
              <Text style={styles.small}>{name}</Text>
              <Text style={[styles.body, { fontWeight: "600" }]}>{money(v)}</Text>
            </View>
          ))}
      </Card>
      <SectionHeader title="Fare breakdown" icon="receipt" />
      <Fare value={l.pricing.quote} />
      <Text style={[styles.small, { textAlign: "center" }]}>
        This is a search estimate. We request a fresh price for your account
        before confirmation.
      </Text>
    </Screen>
  );
}

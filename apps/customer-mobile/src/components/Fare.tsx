import { PriceDisplay } from "./Premium";
import { Text, View } from "react-native";
import type { Fare as FareValue } from "../types";
import { money } from "../utils/journey";
import { Card, styles } from "./ui";
export function Fare({ value }: { value: FareValue }) {
  const rows = [
    ["Vendor fare", value.vendorFare],
    ["Platform fee", value.platformFee],
    ["GST", value.taxAmount],
    ["Other charges", value.passThroughTotal],
    ["Vendor discount", value.vendorFundedDiscount],
    ["RideGrid discount", value.rideGridFundedDiscount],
  ];
  return (
    <Card>
      <Text style={styles.heading}>Your fare, clearly</Text>
      {rows
        .filter(
          ([name, amount]) => !name.includes("discount") || Number(amount) > 0,
        )
        .map(([name, amount]) => (
          <View key={name} style={styles.row}>
            <Text style={styles.small}>{name}</Text>
            <Text style={styles.body}>{money(amount)}</Text>
          </View>
        ))}
      <View style={styles.row}>
        <PriceDisplay
          value={value.finalPayable}
          caption="Final payable · Includes the charges above"
        />
      </View>
      {value.passThroughCharges?.map((c, i) => (
        <Text key={i} style={styles.small}>
          {c.name}: {c.included ? "Included" : money(c.amount)}
        </Text>
      ))}
    </Card>
  );
}

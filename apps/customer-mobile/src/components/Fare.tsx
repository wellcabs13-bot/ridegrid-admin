import { Text, View } from "react-native";
import type { Fare as FareValue } from "../types";
import { money } from "../utils/journey";
import { Card, styles, theme } from "./ui";
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
      <Text style={[styles.heading, { fontSize: 16 }]}>Your fare, clearly</Text>
      {rows
        .filter(
          ([name, amount]) => !name.includes("discount") || Number(amount) > 0,
        )
        .map(([name, amount]) => (
          <View key={name} style={styles.row}>
            <Text style={styles.small}>{name}</Text>
            <Text style={[styles.body, { fontWeight: "600" }]}>{money(amount)}</Text>
          </View>
        ))}
      <View
        style={[
          styles.row,
          {
            backgroundColor: theme.brandSoft,
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 12,
          },
        ]}
      >
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={[styles.body, { fontWeight: "700" }]}>Final payable</Text>
          <Text style={[styles.small, { fontSize: 11.5 }]}>Includes the charges above</Text>
        </View>
        <Text style={{ color: theme.brand, fontSize: 24, fontWeight: "800", letterSpacing: -0.6 }}>
          {money(value.finalPayable)}
        </Text>
      </View>
      {value.passThroughCharges?.map((c, i) => (
        <Text key={i} style={styles.small}>
          {c.name}: {c.included ? "Included" : money(c.amount)}
        </Text>
      ))}
    </Card>
  );
}

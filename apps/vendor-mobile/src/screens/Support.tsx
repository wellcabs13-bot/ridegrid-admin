import { Linking, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { colors, IconTile, Label, ListRow, Menu, Notice, Screen, State } from "../components/ui";
import { useVendor } from "../services/vendor";
import type { Config } from "../types";
import { useState } from "react";

export default function Support() {
  const q = useVendor<Config>("config"),
    { booking, vehicle } = useLocalSearchParams<{ booking?: string; vehicle?: string }>(),
    subject = booking ? `Vendor booking support: ${booking}` : vehicle ? `Car photos for ${vehicle}` : "",
    [error, setError] = useState("");
  const open = (url: string) => Linking.openURL(url).catch(() => setError("No app could open this contact link."));
  return (
    <Screen title="Help & Support">
      <View style={{ alignItems: "center", gap: 8, paddingVertical: 8 }}>
        <IconTile icon="headset" tone="green" size={76} />
        <Text style={{ fontSize: 20, fontWeight: "900", color: colors.text, textAlign: "center" }}>Operations support</Text>
        <Label muted center>
          {booking
            ? `Help with booking ${booking}`
            : vehicle
              ? `Email clear photos of ${vehicle} (front, side, rear and interior). Operations reviews them before customers see them.`
              : "Contact the operations team using the configured RideGrid support channels."}
        </Label>
      </View>
      <State loading={q.isPending} error={q.error} retry={() => q.refetch()} />
      {!!error && <Notice tone="red" text={error} />}
      {q.data && (
        <Menu>
          <ListRow icon="call-outline" tone="red" title="Call Operations" subtitle="Speak to the RideGrid team" onPress={() => open(q.data!.support.phoneHref)} />
          <ListRow icon="mail-outline" tone="blue" title="Email Operations" subtitle={subject || "Send details or documents"} onPress={() => open(q.data!.support.emailHref + (subject ? `?subject=${encodeURIComponent(subject)}` : ""))} />
          <ListRow icon="logo-whatsapp" tone="green" title="Open WhatsApp" subtitle="Message Operations" last onPress={() => open(q.data!.support.whatsapp)} />
        </Menu>
      )}
    </Screen>
  );
}

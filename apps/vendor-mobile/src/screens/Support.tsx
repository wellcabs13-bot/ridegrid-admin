import { Linking } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Button, Card, Label, Screen, State } from "../components/ui";
import { useVendor } from "../services/vendor";
import type { Config } from "../types";
import { useState } from "react";
export default function Support() {
  const q = useVendor<Config>("config"),
    { booking } = useLocalSearchParams<{ booking?: string }>(),
    [error, setError] = useState("");
  const open = (url: string) =>
    Linking.openURL(url).catch(() =>
      setError("No app could open this contact link."),
    );
  return (
    <Screen title="Operations support">
      <Label muted>
        {booking
          ? `Help with booking ${booking}`
          : "Contact the operations team using the configured RideGrid support channels."}
      </Label>
      <State loading={q.isPending} error={q.error} retry={() => q.refetch()} />
      {!!error && <Label>{error}</Label>}
      {q.data && (
        <Card>
          <Button
            title="Call Operations"
            onPress={() => open(q.data!.support.phoneHref)}
          />
          <Button
            title="Email Operations"
            onPress={() =>
              open(
                q.data!.support.emailHref +
                  (booking
                    ? `?subject=${encodeURIComponent(`Vendor booking support: ${booking}`)}`
                    : ""),
              )
            }
          />
          <Button
            title="Open WhatsApp"
            onPress={() => open(q.data!.support.whatsapp)}
          />
        </Card>
      )}
    </Screen>
  );
}

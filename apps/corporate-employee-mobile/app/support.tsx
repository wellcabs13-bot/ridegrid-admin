import { Linking } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, ErrorState, Heading, LoadingState, Screen, T } from "../src/components/ui";
import { baseURL, corp } from "../src/services/api";
import { useApp } from "../src/state/Providers";
import type { Config } from "../src/types";

// Contact details come only from the server's configured RideGrid support channels.
export default function Support() {
  const { booking } = useLocalSearchParams<{ booking?: string }>();
  const { session } = useApp();
  const q = useQuery({ queryKey: ["config", session?.user.id], queryFn: ({ signal }) => corp<Config>("config", "", signal), enabled: !!session });
  const c = q.data;
  const reference = booking ? ` (booking ${booking})` : "";
  const whatsapp = c?.support.whatsapp ? `${c.support.whatsapp.split("?")[0]}?text=${encodeURIComponent(`Hello RideGrid, I need help with my corporate ride${reference}.`)}` : "";
  const email = c?.support.emailHref ? `${c.support.emailHref}?subject=${encodeURIComponent(`Corporate ride support${reference}`)}` : "";
  return (
    <Screen title="Support" subtitle={booking ? `About booking ${booking}` : "We're here to help with your rides."}>
      {q.isPending && <LoadingState />}
      <ErrorState error={q.error} retry={() => void q.refetch()} />
      {c && (
        <>
          <Card>
            <Heading>Contact {c.support.name}</Heading>
            {booking && <T muted size={13}>Mention booking {booking} so the team can find it quickly.</T>}
            {!!c.support.phoneHref && <Button title="Call support" icon="call-outline" onPress={() => void Linking.openURL(c.support.phoneHref)} />}
            {!!whatsapp && <Button title="WhatsApp" secondary icon="logo-whatsapp" onPress={() => void Linking.openURL(whatsapp)} />}
            {!!email && <Button title="Email support" secondary icon="mail-outline" onPress={() => void Linking.openURL(email)} />}
          </Card>
          <Card>
            <T muted size={13}>For travel policy or approval questions, contact your company's travel administrator.</T>
            <Button title="Booking terms" secondary onPress={() => void Linking.openURL(`${baseURL}${c.termsPath}`)} />
            <Button title="Cancellation policy" secondary onPress={() => void Linking.openURL(`${baseURL}${c.cancellationPath}`)} />
            <Button title="Privacy policy" secondary onPress={() => void Linking.openURL(`${baseURL}${c.privacyPath}`)} />
          </Card>
        </>
      )}
    </Screen>
  );
}

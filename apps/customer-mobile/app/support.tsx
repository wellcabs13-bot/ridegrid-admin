import { Linking, Text } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "../src/services/api";
import type { Config } from "../src/types";
import {
  Screen,
  Card,
  Button,
  Loading,
  ErrorText,
  styles,
} from "../src/components/ui";
export default function Support() {
  const q = useQuery({
    queryKey: ["config"],
    queryFn: () => api<Config>("/api/mobile/config", {}, false),
  });
  return (
    <Screen
      title="Here to help"
      subtitle="Reach the existing Wellcabs support team."
    >
      {q.isPending ? (
        <Loading />
      ) : q.data ? (
        <Card>
          <Text style={styles.heading}>{q.data.support.name}</Text>
          <Text style={styles.body}>
            Keep your booking number handy when you contact us.
          </Text>
          <Button
            title="Call support"
            onPress={() => void Linking.openURL(q.data!.support.phoneHref)}
          />
          <Button
            title="Email support"
            secondary
            onPress={() => void Linking.openURL(q.data!.support.emailHref)}
          />
          <Button
            title="Open WhatsApp support"
            secondary
            onPress={() => void Linking.openURL(q.data!.support.whatsapp)}
          />
        </Card>
      ) : null}
      <ErrorText error={q.error} />
      {q.isError && <Button title="Retry" onPress={() => void q.refetch()} />}
    </Screen>
  );
}

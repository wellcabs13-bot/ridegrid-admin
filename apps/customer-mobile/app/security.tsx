import { useState } from "react";
import { Text } from "react-native";
import { post } from "../src/services/api";
import { useApp } from "../src/state/Providers";
import {
  Screen,
  Card,
  Button,
  ErrorText,
  SignedIn,
  styles,
} from "../src/components/ui";
export default function Security() {
  const { session, online } = useApp();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function reset() {
    setBusy(true);
    setError("");
    try {
      await post(
        "/api/auth/forgot-password",
        { email: session?.user.email },
        false,
      );
      setMessage(
        "A reset link has been requested. Contact support if it does not arrive.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen title="Password & security">
      <SignedIn>
        <Card>
          <Text style={styles.heading}>Reset your password</Text>
          <Text style={styles.body}>
            Use your existing RideGrid password reset flow to choose a new
            password.
          </Text>
          <Text style={styles.small}>
            Passwords are never saved on this device.
          </Text>
          <ErrorText error={error} />
          {!!message && <Text style={styles.body}>{message}</Text>}
          <Button
            title="Request password reset"
            busy={busy}
            disabled={!online}
            onPress={() => void reset()}
          />
        </Card>
      </SignedIn>
    </Screen>
  );
}

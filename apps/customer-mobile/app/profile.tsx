import { useState, useEffect } from "react";
import { Text } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../src/services/api";
import { useApp } from "../src/state/Providers";
import type { Profile } from "../src/types";
import {
  Screen,
  Card,
  Field,
  Button,
  ErrorText,
  SignedIn,
  Loading,
  styles,
} from "../src/components/ui";
export default function ProfileScreen() {
  const { session, online } = useApp();
  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");
  const client = useQueryClient();
  const q = useQuery({
    queryKey: ["profile", session?.user.id],
    queryFn: () => api<Profile>("/api/mobile/profile"),
    enabled: !!session,
  });
  useEffect(() => {
    if (q.data) {
      setFirst(q.data.firstName);
      setLast(q.data.lastName);
    }
  }, [q.data]);
  const save = useMutation({
    mutationFn: () =>
      api("/api/mobile/profile", {
        method: "PATCH",
        body: JSON.stringify({ firstName, lastName }),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["profile"] }),
  });
  return (
    <Screen title="Personal information">
      <SignedIn>
        {q.isPending ? (
          <Loading />
        ) : (
          <Card>
            <Field
              label="First name"
              value={firstName}
              onChangeText={setFirst}
              maxLength={100}
            />
            <Field
              label="Last name"
              value={lastName}
              onChangeText={setLast}
              maxLength={100}
            />
            <Text style={styles.body}>{q.data?.user.email}</Text>
            <Text style={styles.body}>{q.data?.user.mobile}</Text>
            <Text style={styles.small}>
              Contact support to change your sign-in email or mobile number.
            </Text>
            <ErrorText error={q.error || save.error} />
            {save.isSuccess && (
              <Text accessibilityLiveRegion="polite" style={styles.body}>
                Your name has been updated.
              </Text>
            )}
            <Button
              title="Save changes"
              busy={save.isPending}
              disabled={!online || !firstName.trim() || !lastName.trim()}
              onPress={() => save.mutate()}
            />
          </Card>
        )}
      </SignedIn>
    </Screen>
  );
}

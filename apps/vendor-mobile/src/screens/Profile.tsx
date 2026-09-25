import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Documents,
  Field,
  Label,
  LinkButton,
  Screen,
  State,
} from "../components/ui";
import { useSave, useVendor } from "../services/vendor";
import { useApp } from "../state/Providers";
import type { Profile as Data } from "../types";
export default function Profile() {
  const q = useVendor<Data>("profile"),
    save = useSave("profile"),
    { online } = useApp(),
    [form, setForm] = useState<Record<string, string>>({});
  useEffect(() => {
    if (q.data)
      setForm({
        address: q.data.address || "",
        city: q.data.city || "",
        state: q.data.state || "",
        pinCode: q.data.pinCode || "",
      });
  }, [q.data]);
  return (
    <Screen
      title="Business profile"
      refresh={() => q.refetch()}
      refreshing={q.isRefetching}
    >
      <State
        loading={q.isPending}
        error={q.error || save.error}
        retry={() => q.refetch()}
      />
      {q.data && (
        <>
          <Card>
            <Label large>{q.data.companyName}</Label>
            <Badge
              value={q.data.isApproved ? "APPROVED" : "PENDING_APPROVAL"}
            />
            <Label>{q.data.user.name}</Label>
            <Label>{q.data.user.email}</Label>
            <Label>{q.data.user.mobile || "No contact number recorded"}</Label>
            {q.data.accountLast4 && (
              <Label muted>
                {q.data.bankName} · account ending {q.data.accountLast4}
              </Label>
            )}
          </Card>
          <Card>
            {Object.entries(form).map(([key, value]) => (
              <Field
                key={key}
                label={
                  key === "pinCode"
                    ? "Postal code"
                    : key.charAt(0).toUpperCase() + key.slice(1)
                }
                value={value}
                onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
              />
            ))}
            <Button
              title={save.isPending ? "Saving…" : "Save address"}
              disabled={!online || save.isPending}
              onPress={() => save.mutate(form)}
            />
            {save.isSuccess && <Label>Address saved.</Label>}
          </Card>
          <LinkButton
            title="Password recovery / reset"
            href="/forgot-password"
          />
          <Documents items={q.data.documents} />
          <LinkButton
            title="Upload business document"
            href={`/document-upload?entity=vendor&entityId=${q.data.id}`}
          />
          <LinkButton
            title="Document updates & business verification"
            href="/support"
          />
        </>
      )}
    </Screen>
  );
}

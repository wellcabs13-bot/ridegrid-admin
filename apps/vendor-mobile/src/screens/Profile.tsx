import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Avatar, Badge, Button, colors, DocumentRow, FadeIn, Field, Label, ListRow, Menu, Notice, Screen, shortId, StandingCard, State } from "../components/ui";
import { useSave, useVendor } from "../services/vendor";
import { useApp } from "../state/Providers";
import type { Profile as Data } from "../types";

const ADDRESS_LABELS: Record<string, string> = { address: "Address", city: "City", state: "State", pinCode: "Postal code" };
type Panel = "company" | "contact" | "bank" | "documents" | null;

function Line({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>["name"]; text: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 10, alignItems: "center", paddingVertical: 6, paddingLeft: 6 }}>
      <Ionicons name={icon} size={17} color={colors.muted} />
      <Text style={{ flex: 1, fontSize: 14.5, color: colors.text, fontWeight: "600" }}>{text}</Text>
    </View>
  );
}

export default function Profile() {
  const q = useVendor<Data>("profile"),
    save = useSave("profile"),
    { online } = useApp(),
    [form, setForm] = useState<Record<string, string>>({}),
    [panel, setPanel] = useState<Panel>(null);
  useEffect(() => {
    if (q.data) setForm({ address: q.data.address || "", city: q.data.city || "", state: q.data.state || "", pinCode: q.data.pinCode || "" });
  }, [q.data]);
  const p = q.data;
  const toggle = (k: Panel) => setPanel((c) => (c === k ? null : k));
  const caret = (k: Panel) => <Ionicons name={panel === k ? "chevron-up" : "chevron-down"} size={18} color={colors.faint} />;
  return (
    <Screen title="My Profile" refresh={() => q.refetch()} refreshing={q.isRefetching}>
      <State loading={q.isPending} error={q.error || save.error} retry={() => q.refetch()} />
      {p && (
        <>
          <FadeIn style={{ alignItems: "center", gap: 6, paddingVertical: 8 }}>
            <Avatar name={p.companyName} size={92} ring />
            <Text style={{ fontSize: 20, fontWeight: "900", color: colors.text, textAlign: "center", marginTop: 6 }}>{p.companyName}</Text>
            <Text style={{ fontSize: 13, color: colors.muted, fontWeight: "600" }}>Vendor ID: {shortId(p.id)}</Text>
            <Badge value={p.standing?.state === "SUSPENDED" ? "SUSPENDED" : p.isApproved ? "VERIFIED" : "VERIFICATION_PENDING"} large />
          </FadeIn>
          <Menu>
            <ListRow icon="business-outline" title="Company Details" subtitle={[p.city, p.state].filter(Boolean).join(", ") || "Business address"} right={caret("company")} onPress={() => toggle("company")} />
            {panel === "company" && (
              <View style={{ gap: 10, paddingVertical: 10 }}>
                {Object.entries(form).map(([key, value]) => (
                  <Field key={key} label={ADDRESS_LABELS[key] || key} value={value} onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))} />
                ))}
                {save.isSuccess && <Notice tone="green" icon="checkmark-circle" text="Address saved." />}
                <Button title="Save Address" icon="save-outline" busy={save.isPending} disabled={!online} onPress={() => save.mutate(form)} />
              </View>
            )}
            <ListRow icon="person-outline" title="Contact Person" subtitle={p.user.name} right={caret("contact")} onPress={() => toggle("contact")} />
            {panel === "contact" && (
              <View style={{ paddingVertical: 6 }}>
                <Line icon="person-outline" text={p.user.name} />
                <Line icon="mail-outline" text={p.user.email} />
                <Line icon="call-outline" text={p.user.mobile || "No contact number recorded"} />
              </View>
            )}
            {!!p.accountLast4 && <ListRow icon="card-outline" title="Bank & Payout Details" subtitle={`${p.bankName || "Bank"} · ending ${p.accountLast4}`} />}
            <ListRow icon="document-text-outline" title="Documents" subtitle={`${p.documents.length} recorded`} right={caret("documents")} onPress={() => toggle("documents")} />
            {panel === "documents" && (
              <View>
                {p.documents.map((d, i) => <DocumentRow key={d.id} doc={d} last={i === p.documents.length - 1} />)}
                {!p.documents.length && <Label small muted>No documents recorded.</Label>}
              </View>
            )}
            <ListRow icon="cloud-upload-outline" title="Upload Business Document" subtitle="PAN, GST, Udyam or other" onPress={() => router.push(`/document-upload?entity=vendor&entityId=${p.id}`)} />
            <ListRow icon="shield-checkmark-outline" title="Verification Support" subtitle="Document updates via Operations" onPress={() => router.push("/support")} />
            <ListRow icon="key-outline" title="Password Recovery" last onPress={() => router.push("/forgot-password")} />
          </Menu>
          {p.standing && <StandingCard standing={p.standing} />}
        </>
      )}
    </Screen>
  );
}

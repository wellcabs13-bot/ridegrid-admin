import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Avatar, Badge, Button, Card, colors, Documents, FadeIn, Field, gradients, ListRow, Menu, Notice, Screen, SectionTitle, shadow, shortId, StandingCard, State } from "../components/ui";
import { useSave, useVendor } from "../services/vendor";
import { useApp } from "../state/Providers";
import type { Profile as Data } from "../types";

const ADDRESS_LABELS: Record<string, string> = { address: "Address", city: "City", state: "State", pinCode: "Postal code" };

export default function Profile() {
  const q = useVendor<Data>("profile"),
    save = useSave("profile"),
    { online } = useApp(),
    [form, setForm] = useState<Record<string, string>>({});
  useEffect(() => {
    if (q.data) setForm({ address: q.data.address || "", city: q.data.city || "", state: q.data.state || "", pinCode: q.data.pinCode || "" });
  }, [q.data]);
  const p = q.data;
  return (
    <Screen title="Business Profile" refresh={() => q.refetch()} refreshing={q.isRefetching}>
      <State loading={q.isPending} error={q.error || save.error} retry={() => q.refetch()} />
      {p && (
        <>
          <FadeIn>
            <LinearGradient colors={gradients.soft} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 18, gap: 14, borderWidth: 1, borderColor: colors.border, ...shadow }}>
              <View style={{ alignItems: "center", gap: 6 }}>
                <Avatar name={p.companyName} size={84} ring />
                <Text style={{ fontSize: 21, fontWeight: "900", color: colors.text, textAlign: "center" }}>{p.companyName}</Text>
                <Text style={{ fontSize: 13, color: colors.muted, fontWeight: "700" }}>Vendor ID · {shortId(p.id)}</Text>
                <Badge value={p.standing?.state === "SUSPENDED" ? "SUSPENDED" : p.isApproved ? "VERIFIED" : "VERIFICATION_PENDING"} large />
              </View>
              <View style={{ backgroundColor: "#FFFFFFCC", borderRadius: 16, padding: 12, gap: 8 }}>
                {(
                  [
                    ["person-outline", p.user.name],
                    ["mail-outline", p.user.email],
                    ["call-outline", p.user.mobile || "No contact number recorded"],
                    ...(p.accountLast4 ? [["card-outline", `${p.bankName || "Bank"} · account ending ${p.accountLast4}`]] : []),
                  ] as [React.ComponentProps<typeof Ionicons>["name"], string][]
                ).map(([icon, text]) => (
                  <View key={icon} style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                    <Ionicons name={icon} size={17} color={colors.muted} />
                    <Text style={{ flex: 1, fontSize: 14, color: colors.text, fontWeight: "600" }} numberOfLines={1}>{text}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>
          </FadeIn>
          {p.standing && <StandingCard standing={p.standing} />}
          <SectionTitle title="Business address" icon="location-outline" tone="red" />
          <Card>
            {Object.entries(form).map(([key, value]) => (
              <Field key={key} label={ADDRESS_LABELS[key] || key} value={value} onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))} />
            ))}
            {save.isSuccess && <Notice tone="green" icon="checkmark-circle" text="Address saved." />}
            <Button title="Save Address" icon="save-outline" busy={save.isPending} disabled={!online} onPress={() => save.mutate(form)} />
          </Card>
          <Documents items={p.documents} />
          <Menu>
            <ListRow icon="cloud-upload-outline" tone="green" title="Upload business document" subtitle="PAN, GST, Udyam or other" onPress={() => router.push(`/document-upload?entity=vendor&entityId=${p.id}`)} />
            <ListRow icon="shield-checkmark-outline" tone="blue" title="Document updates & verification" subtitle="Contact Operations" onPress={() => router.push("/support")} />
            <ListRow icon="key-outline" title="Password recovery / reset" last onPress={() => router.push("/forgot-password")} />
          </Menu>
        </>
      )}
    </Screen>
  );
}

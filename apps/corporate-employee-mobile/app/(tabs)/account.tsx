import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, ConfirmationSheet, ErrorState, Heading, KeyValue, LoadingState, MenuRow, Screen, T, colors } from "../../src/components/ui";
import { corp } from "../../src/services/api";
import { logout, useApp } from "../../src/state/Providers";
import type { Profile } from "../../src/types";
import { label } from "../../src/utils/journey";

export default function Account() {
  const { session } = useApp();
  const [leaving, setLeaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const q = useQuery({ queryKey: ["profile", session?.user.id], queryFn: ({ signal }) => corp<Profile>("profile", "", signal), enabled: !!session });
  const p = q.data;
  return (
    <Screen title="Profile" refresh={() => void q.refetch()} refreshing={q.isRefetching}>
      {q.isPending && <LoadingState />}
      <ErrorState error={q.error} retry={() => void q.refetch()} />
      {p && (
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
              <T weight="800" size={18} color={colors.brand}>{p.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}</T>
            </View>
            <View style={{ flex: 1 }}>
              <Heading>{p.name}</Heading>
              <T muted size={12}>Employee ID: {p.employeeCode} · {p.company.name}</T>
            </View>
          </View>
          <T muted size={13}>{p.designation}{p.grade ? ` · Grade ${p.grade}` : ""}</T>
          <KeyValue k="Company" v={p.company.name} />
          <KeyValue k="Employee code" v={p.employeeCode} />
          <KeyValue k="Work email" v={p.email} />
          <KeyValue k="Mobile" v={p.mobile} />
          {p.branch && <KeyValue k="Branch" v={`${p.branch.name}${p.branch.city ? `, ${p.branch.city}` : ""}`} />}
          {p.department && <KeyValue k="Department" v={p.department} />}
          {p.costCenter && <KeyValue k="Cost center" v={p.costCenter} />}
          {p.managerName && <KeyValue k="Manager" v={p.managerName} />}
          <KeyValue k="Corporate role" v={p.isApprover ? "Employee · approver" : "Employee"} />
          <KeyValue k="Booking" v={p.canBook === false ? "Not enabled by your company" : "Enabled"} />
          <KeyValue k="Status" v={label(p.status)} />
          <T muted size={12}>Your company's travel administrator maintains these details. Contact them to make changes.</T>
        </Card>
      )}
      <Card>
        <MenuRow icon="document-text-outline" title="Company Policy" subtitle="What you can book and when approval is needed" onPress={() => router.push("/policy")} />
        <MenuRow icon="card-outline" title="Payment & Billing" subtitle="Corporate billing, credit and limits" onPress={() => router.push({ pathname: "/policy", params: { tab: "billing" } })} />
        <MenuRow icon="shield-checkmark-outline" title="My Approval Requests" onPress={() => router.push("/approvals")} />
        {!!p?.isApprover && <MenuRow icon="checkmark-done-outline" title="Requests to Review" subtitle="Colleagues' rides assigned to you" onPress={() => router.push("/reviews")} />}
        <MenuRow icon="notifications-outline" title="Notifications" subtitle="Booking and approval updates" onPress={() => router.push("/notifications")} />
        <MenuRow icon="help-buoy-outline" title="Emergency Support & Help" subtitle="Call, email or WhatsApp RideGrid" onPress={() => router.push("/support")} />
        <MenuRow icon="lock-closed-outline" title="Security" subtitle="Change your password" onPress={() => router.push("/forgot-password")} />
      </Card>
      <Button title="Log Out" danger icon="log-out-outline" onPress={() => setLeaving(true)} />
      <ConfirmationSheet
        visible={leaving}
        busy={busy}
        title="Sign out?"
        body="Your session and saved trip lists are removed from this device."
        confirm="Sign out"
        onCancel={() => setLeaving(false)}
        onConfirm={() => {
          setBusy(true);
          void logout().finally(() => {
            setBusy(false);
            setLeaving(false);
            router.replace("/login");
          });
        }}
      />
    </Screen>
  );
}

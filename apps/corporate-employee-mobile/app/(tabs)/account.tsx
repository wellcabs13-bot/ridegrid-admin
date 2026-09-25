import { useState } from "react";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, ConfirmationSheet, ErrorState, Heading, KeyValue, LoadingState, MenuRow, Screen, T } from "../../src/components/ui";
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
    <Screen title="Account" refresh={() => void q.refetch()} refreshing={q.isRefetching}>
      {q.isPending && <LoadingState />}
      <ErrorState error={q.error} retry={() => void q.refetch()} />
      {p && (
        <Card>
          <Heading>{p.name}</Heading>
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
          <KeyValue k="Status" v={label(p.status)} />
          <T muted size={12}>Your company's travel administrator maintains these details. Contact them to make changes.</T>
        </Card>
      )}
      <Card>
        <MenuRow icon="document-text-outline" title="Travel policy" subtitle="What you can book and when approval is needed" onPress={() => router.push("/policy")} />
        <MenuRow icon="shield-checkmark-outline" title="Approval requests" onPress={() => router.push("/approvals")} />
        <MenuRow icon="help-buoy-outline" title="Support" subtitle="Call, email or WhatsApp RideGrid" onPress={() => router.push("/support")} />
        <MenuRow icon="lock-closed-outline" title="Security" subtitle="Change your password" onPress={() => router.push("/forgot-password")} />
      </Card>
      <Button title="Sign out" secondary icon="log-out-outline" onPress={() => setLeaving(true)} />
      <ConfirmationSheet
        visible={leaving}
        busy={busy}
        title="Sign out?"
        body="Saved trip lists on this device are cleared when another account signs in."
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

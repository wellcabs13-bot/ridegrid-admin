import React from "react";
import { Alert, Linking, Modal, Pressable, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, colors, Label } from "../components/ui";
import { useTracking } from "../state/Tracking";
import type { DriverAction } from "../utils/trips";

export const open = (url: string) =>
  Linking.openURL(url).catch(() => Alert.alert("Unable to open", "No compatible app is available. Please try again on your phone."));
export const telHref = (phone: string) => `tel:${phone.replace(/[^+\d]/g, "")}`;

const COPY: Record<DriverAction, { title: string; text: string; confirm: string; variant: "primary" | "success" }> = {
  ARRIVED: { title: "Arrived at pickup?", text: "Confirm only when you are at the pickup point. The customer will be told you have arrived.", confirm: "Yes, I have arrived", variant: "primary" },
  START: { title: "Start this trip?", text: "Start only when the customer is on board and it is safe to drive.", confirm: "Yes, start trip", variant: "success" },
  COMPLETE: { title: "Complete this trip?", text: "Complete only after the customer has been dropped at the destination.", confirm: "Yes, complete trip", variant: "primary" },
};
// RideGrid must accept the update before the trip status changes on this phone.
export function ConfirmSheet({ action, busy, close, confirm }: { action: DriverAction | null; busy: boolean; close: () => void; confirm: () => void }) {
  const c = action ? COPY[action] : null;
  return (
    <Modal visible={!!action} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={{ flex: 1, backgroundColor: "#0008" }} onPress={close} />
      <SafeAreaView edges={["bottom"]} style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12 }}>
        <View style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
        <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>{c?.title}</Text>
        <Label muted>{c?.text}</Label>
        <Button title={c?.confirm || "Confirm"} variant={c?.variant} busy={busy} onPress={confirm} />
        <Button title="Go back" variant="secondary" disabled={busy} onPress={close} />
      </SafeAreaView>
    </Modal>
  );
}

// Foreground GPS upload for the current trip (see state/Tracking).
export function LocationCard() {
  const tracking = useTracking();
  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: tracking.enabled ? colors.greenSoft : colors.greySoft, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="navigate" size={20} color={tracking.enabled ? colors.green : colors.muted} />
        </View>
        <View style={{ flex: 1 }}>
          <Label bold>Share live location</Label>
          <Label small muted>{tracking.message}</Label>
        </View>
        <Switch
          accessibilityLabel="Share live location"
          value={tracking.enabled}
          onValueChange={() => void tracking.toggle()}
          trackColor={{ true: colors.green, false: colors.border }}
          thumbColor="#FFFFFF"
        />
      </View>
      <Label small muted>Uploads about every 30 seconds while this app is open. Sharing pauses in the background.</Label>
    </Card>
  );
}

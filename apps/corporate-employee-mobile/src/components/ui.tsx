import React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { useApp } from "../state/Providers";

// RideGrid premium design system (mirrors app/globals.css --rg-* tokens on
// web, and the customer/vendor/driver mobile apps' themes) — single source
// of truth.
export const colors = {
  bg: "#0A0A0C",
  surface: "#1C1C21",
  raised: "#26262C",
  border: "#2A2A30",
  text: "#F5F5F7",
  muted: "#9A9AA2",
  brand: "#EF4444",
  brandDark: "#B91C1C",
  blue: "#3B82F6",
  purple: "#A78BFA",
  emerald: "#34D399",
  amber: "#FBBF24",
  red: "#F87171",
};
type Icon = React.ComponentProps<typeof Ionicons>["name"];
const TABS = ["/", "/book", "/trips", "/notifications", "/account", "/login"];

export function T({ children, muted, size = 15, weight = "400", color, center }: React.PropsWithChildren<{ muted?: boolean; size?: number; weight?: "400" | "600" | "700" | "800"; color?: string; center?: boolean }>) {
  return (
    <Text style={{ color: color || (muted ? colors.muted : colors.text), fontSize: size, fontWeight: weight, lineHeight: Math.round(size * 1.45), flexShrink: 1, textAlign: center ? "center" : "left" }}>
      {children}
    </Text>
  );
}
export const Title = ({ children }: React.PropsWithChildren) => <T size={22} weight="800">{children}</T>;
export const Heading = ({ children }: React.PropsWithChildren) => <T size={17} weight="700">{children}</T>;

export function OfflineBanner() {
  const { online } = useApp();
  if (online) return null;
  return (
    <View style={s.banner} accessibilityRole="alert">
      <Ionicons name="cloud-offline-outline" size={18} color={colors.amber} />
      <T size={13}>Offline. Showing saved information. Bookings and requests need a connection.</T>
    </View>
  );
}

// CorporateScreen: the shared frame with header, back navigation and offline state.
export function Screen({ title, subtitle, children, refresh, refreshing = false, scroll = true }: React.PropsWithChildren<{ title: string; subtitle?: string; refresh?: () => void; refreshing?: boolean; scroll?: boolean }>) {
  const pathname = usePathname();
  const back = !TABS.includes(pathname);
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={s.screen}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={s.header}>
          {back && (
            <Pressable accessibilityRole="button" accessibilityLabel="Back" style={s.iconButton} onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}>
              <Ionicons name="chevron-back" size={22} color={colors.brand} />
            </Pressable>
          )}
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.brand}>RIDEGRID / CORPORATE</Text>
            <Title>{title}</Title>
            {!!subtitle && <T muted size={13}>{subtitle}</T>}
          </View>
        </View>
        <OfflineBanner />
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.body}
            refreshControl={refresh ? <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} /> : undefined}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Card({ children, tone }: React.PropsWithChildren<{ tone?: string }>) {
  return <View style={[s.card, tone ? { borderColor: tone } : null]}>{children}</View>;
}
export function Row({ children }: React.PropsWithChildren) {
  return <View style={s.row}>{children}</View>;
}
export function Button({ title, onPress, disabled, busy, secondary, danger, icon }: { title: string; onPress: () => void; disabled?: boolean; busy?: boolean; secondary?: boolean; danger?: boolean; icon?: Icon }) {
  const off = disabled || busy;
  const fg = secondary ? colors.brand : colors.bg;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      onPress={onPress}
      disabled={off}
      style={[s.button, secondary ? s.secondary : { backgroundColor: danger ? colors.red : colors.brand }, { opacity: off ? 0.5 : 1 }]}
    >
      {busy ? <ActivityIndicator color={fg} /> : icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
      <Text style={[s.buttonText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}
export function Field({ label, value, onChangeText, secret, multiline, placeholder, email }: { label: string; value: string; onChangeText: (v: string) => void; secret?: boolean; multiline?: boolean; placeholder?: string; email?: boolean }) {
  return (
    <View style={{ gap: 6 }}>
      <T muted size={13}>{label}</T>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secret}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={email ? "email-address" : "default"}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={[s.input, multiline ? { minHeight: 84, textAlignVertical: "top" } : null]}
      />
    </View>
  );
}
export function Chips({ values, value, onChange, format = (v: string) => v.replaceAll("_", " ") }: { values: string[]; value: string; onChange: (v: string) => void; format?: (v: string) => string }) {
  return (
    <View style={s.wrap}>
      {values.map((v) => (
        <Pressable key={v} accessibilityRole="button" accessibilityState={{ selected: v === value }} onPress={() => onChange(v)} style={[s.chip, v === value && { borderColor: colors.brand, backgroundColor: "rgba(239,68,68,0.18)" }]}>
          <Text style={{ color: v === value ? colors.brand : colors.muted, fontSize: 13, fontWeight: "700" }}>{format(v)}</Text>
        </Pressable>
      ))}
    </View>
  );
}
export function Pill({ text, color, icon }: { text: string; color: string; icon?: Icon }) {
  return (
    <View style={[s.pill, { borderColor: color }]}>
      {icon && <Ionicons name={icon} size={13} color={color} />}
      <Text style={{ color, fontSize: 12, fontWeight: "800" }}>{text}</Text>
    </View>
  );
}
export function LoadingState({ rows = 2 }: { rows?: number }) {
  return (
    <View style={{ gap: 12 }} accessibilityLabel="Loading">
      <ActivityIndicator color={colors.brand} />
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={[s.card, { height: 96, opacity: 0.6 - i * 0.2 }]} />
      ))}
    </View>
  );
}
export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  if (!error) return null;
  return (
    <Card tone={colors.red}>
      <Row>
        <Ionicons name="alert-circle-outline" size={20} color={colors.red} />
        <View style={{ flex: 1 }}>
          <T>{error instanceof Error ? error.message : String(error)}</T>
        </View>
      </Row>
      {retry && <Button title="Try again" secondary onPress={retry} />}
    </Card>
  );
}
export function EmptyState({ title, body, icon = "file-tray-outline" }: { title: string; body: string; icon?: Icon }) {
  return (
    <Card>
      <View style={{ alignItems: "center", gap: 8, paddingVertical: 8 }}>
        <Ionicons name={icon} size={28} color={colors.muted} />
        <T weight="700" center>{title}</T>
        <T muted size={13} center>{body}</T>
      </View>
    </Card>
  );
}
export function Message({ text, tone = colors.red }: { text?: string; tone?: string }) {
  if (!text) return null;
  return (
    <View accessibilityRole="alert" style={{ borderLeftWidth: 3, borderColor: tone, paddingLeft: 10 }}>
      <T size={14}>{text}</T>
    </View>
  );
}
export function MenuRow({ icon, title, subtitle, onPress }: { icon: Icon; title: string; subtitle?: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={s.menu}>
      <Ionicons name={icon} size={20} color={colors.brand} />
      <View style={{ flex: 1 }}>
        <T weight="600">{title}</T>
        {!!subtitle && <T muted size={13}>{subtitle}</T>}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}
export function KeyValue({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <View style={s.kv}>
      <T muted size={13}>{k}</T>
      <View style={{ flexShrink: 1, alignItems: "flex-end" }}>{typeof v === "string" || typeof v === "number" ? <T size={14} weight="600">{v}</T> : v}</View>
    </View>
  );
}
// ConfirmationSheet: an explicit second step before any booking or approval request.
export function ConfirmationSheet({ visible, title, body, confirm, onConfirm, onCancel, busy }: { visible: boolean; title: string; body: string; confirm: string; onConfirm: () => void; onCancel: () => void; busy?: boolean }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={s.scrim}>
        <View style={s.sheet}>
          <Heading>{title}</Heading>
          <T muted>{body}</T>
          <Button title={confirm} busy={busy} onPress={onConfirm} />
          <Button title="Go back" secondary disabled={busy} onPress={onCancel} />
        </View>
      </View>
    </Modal>
  );
}
export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, flexDirection: "row", gap: 10, alignItems: "center" },
  brand: { color: colors.brand, fontSize: 10, fontWeight: "800", letterSpacing: 2 },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: colors.surface },
  body: { padding: 16, paddingBottom: 40, gap: 14 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 16, gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  button: { minHeight: 52, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", gap: 8, justifyContent: "center", alignItems: "center" },
  secondary: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.raised },
  buttonText: { fontWeight: "800", textAlign: "center", fontSize: 15, flexShrink: 1 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, backgroundColor: colors.raised, minHeight: 50, fontSize: 16 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44, justifyContent: "center" },
  pill: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  banner: { flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: "#3A2E12", paddingHorizontal: 16, paddingVertical: 10 },
  menu: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingVertical: 8 },
  kv: { flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "flex-start" },
  scrim: { flex: 1, backgroundColor: "#000A", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 32, gap: 12, borderWidth: 1, borderColor: colors.border },
});

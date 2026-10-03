import React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, usePathname } from "expo-router";
import { useApp } from "../state/Providers";
import type { Booking, Document, DriverName } from "../types";
// RideGrid premium design system (mirrors app/globals.css --rg-* tokens on
// web, and the customer/vendor mobile apps' themes) — single source of truth.
export const colors = {
  bg: "#0A0A0C",
  surface: "#1C1C21",
  border: "#2A2A30",
  text: "#F5F5F7",
  muted: "#9A9AA2",
  brand: "#EF4444",
  brandDark: "#B91C1C",
  purple: "#AE9BFF",
  green: "#68E1AB",
  red: "#FF929D",
  amber: "#FFD080",
};
export function Label({
  children,
  muted = false,
  large = false,
}: React.PropsWithChildren<{ muted?: boolean; large?: boolean }>) {
  return (
    <Text
      style={{
        color: muted ? colors.muted : colors.text,
        fontSize: large ? 25 : 15,
        fontWeight: large ? "800" : "400",
        lineHeight: large ? 32 : 23,
        flexShrink: 1,
      }}
    >
      {children}
    </Text>
  );
}
export function Screen({
  title,
  children,
  refresh,
  refreshing = false,
  scroll = true,
}: React.PropsWithChildren<{
  title: string;
  refresh?: () => void;
  refreshing?: boolean;
  scroll?: boolean;
}>) {
  const { online } = useApp();
  const pathname = usePathname();
  const back = ![
    "/",
    "/trips",
    "/notifications",
    "/account",
    
    "/login",
  ].includes(pathname);
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={s.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={s.header}>
          {back && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              style={s.bell}
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace("/")
              }
            >
              <Text style={{ color: colors.brand, fontSize: 22 }}>←</Text>
            </Pressable>
          )}
          <View style={{ flex: 1 }}>
            <Text style={s.brand}>RIDEGRID / DRIVER</Text>
            <Label large>{title}</Label>
          </View>
          <Pressable
            accessibilityLabel="Notifications"
            onPress={() => router.push("/notifications")}
            style={s.bell}
          >
            <Text style={{ color: colors.brand, fontSize: 21 }}>◎</Text>
          </Pressable>
        </View>
        {!online && (
          <View style={s.banner}>
            <Label>
              Offline · showing last received data. Reconnect to save.
            </Label>
          </View>
        )}
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.body}
            refreshControl={
              refresh ? (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={refresh}
                  tintColor={colors.brand}
                />
              ) : undefined
            }
          >
            {children}
          </ScrollView>
        ) : (
          children
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Card({ children }: React.PropsWithChildren) {
  return <View style={s.card}>{children}</View>;
}
export function Button({
  title,
  onPress,
  disabled,
  danger,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      style={[
        s.button,
        {
          backgroundColor: danger ? colors.red : colors.brand,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      <Text style={s.buttonText}>{title}</Text>
    </Pressable>
  );
}
export function Field({
  label,
  value,
  onChangeText,
  secret = false,
  numeric = false,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  secret?: boolean;
  numeric?: boolean;
  multiline?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Label muted>{label}</Label>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secret}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={numeric ? "decimal-pad" : "default"}
        multiline={multiline}
        placeholderTextColor={colors.muted}
        style={s.input}
      />
    </View>
  );
}
export function Chips({
  values,
  value,
  onChange,
}: {
  values: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={s.wrap}>
      {values.map((v) => (
        <Pressable
          key={v}
          accessibilityRole="button"
          accessibilityState={{ selected: v === value }}
          onPress={() => onChange(v)}
          style={[
            s.chip,
            { borderColor: v === value ? colors.brand : colors.border },
          ]}
        >
          <Text
            style={{
              color: v === value ? colors.brand : colors.muted,
              fontSize: 12,
              fontWeight: "700",
            }}
          >
            {v === "8_80"
              ? "8 hr / 80 km"
              : v === "12_120"
                ? "12 hr / 120 km"
                : v.replaceAll("_", " ") || "ALL"}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
export function Badge({ value }: { value: string }) {
  const color = /CANCEL|REJECT|EXPIRE|SUSPEND|BLOCK/.test(value)
    ? colors.red
    : /PENDING|MAINTENANCE|RESERV|INACTIVE/.test(value)
      ? colors.amber
      : /AVAILABLE|ACTIVE|APPROVED|COMPLETED|SETTLED/.test(value)
        ? colors.green
        : colors.purple;
  return (
    <Text style={{ color, fontSize: 12, fontWeight: "800", lineHeight: 20 }}>
      {value.replaceAll("_", " ")}
    </Text>
  );
}
export function State({
  loading,
  error,
  empty,
  retry,
}: {
  loading?: boolean;
  error?: Error | null;
  empty?: boolean;
  retry?: () => void;
}) {
  if (loading)
    return (
      <View style={{ gap: 12 }}>
        <ActivityIndicator color={colors.brand} />
        <View style={[s.card, { height: 90, opacity: 0.7 }]} />
        <View style={[s.card, { height: 90, opacity: 0.35 }]} />
      </View>
    );
  if (error)
    return (
      <Card>
        <Label>{error.message}</Label>
        {retry && <Button title="Try again" onPress={retry} />}
      </Card>
    );
  if (empty)
    return (
      <Card>
        <Label>No records to show</Label>
        <Label muted>New activity will appear here when available.</Label>
      </Card>
    );
  return null;
}
export function LinkButton({ title, href }: { title: string; href: string }) {
  return (
    <Pressable style={s.link} onPress={() => router.push(href as never)}>
      <Label>{title}</Label>
      <Text style={{ color: colors.brand }}>→</Text>
    </Pressable>
  );
}
export const name = (d: DriverName | null | undefined) =>
  d ? `${d.firstName} ${d.lastName}` : "Unassigned";
export const money = (v: string | number | null | undefined) =>
  v == null
    ? "Not recorded"
    : `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
export const dateTime = (v: string | null | undefined) =>
  v
    ? new Date(v).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " IST"
    : "Not recorded";
export function BookingCard({ booking: b }: { booking: Booking }) {
  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: "/trip", params: { id: b.id } })
      }
    >
      <Card>
        <View style={s.row}>
          <Label>{b.bookingNumber}</Label>
          <Badge value={["CANCELLED", "TRIP_COMPLETED"].includes(b.status) ? b.status : b.trip?.status || b.status} />
        </View>
        <Label large>
          {b.pickupLocation} → {b.dropLocation}
        </Label>
        <Label muted>
          {dateTime(b.pickupDateTime)} ·{" "}
          {(b.pricingPackage?.packageType || b.tripType).replaceAll("_", " ")}
        </Label>
        <Label>
          {b.vehicle?.registrationNumber}
        </Label>
      </Card>
    </Pressable>
  );
}
export function Documents({ items }: { items: Document[] }) {
  return (
    <View style={{ gap: 12 }}>
      <Label large>Documents</Label>
      {!items.length && <Label muted>No documents recorded.</Label>}
      {items.map((d) => (
        <Card key={d.id}>
          <Label>{d.documentType.replaceAll("_", " ")}</Label>
          <Badge value={d.status} />
          <Label muted>
            {d.expiryDate
              ? `Expiry ${dateTime(d.expiryDate)}`
              : "No expiry recorded"}
          </Label>
          {d.expiryDate &&
            new Date(d.expiryDate).getTime() < Date.now() + 30 * 86400000 && (
              <Badge
                value={
                  new Date(d.expiryDate).getTime() < Date.now()
                    ? "EXPIRED"
                    : "EXPIRING_SOON"
                }
              />
            )}
        </Card>
      ))}
    </View>
  );
}
export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { padding: 20, flexDirection: "row", gap: 8, alignItems: "center" },
  brand: {
    color: colors.brand,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 10,
  },
  bell: {
    minWidth: 48,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  body: { padding: 16, paddingBottom: 40, gap: 16 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    gap: 10,
  },
  button: {
    minHeight: 56,
    borderRadius: 14,
    padding: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: colors.bg,
    fontWeight: "800",
    textAlign: "center",
    fontSize: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    color: colors.text,
    backgroundColor: colors.surface,
    minHeight: 50,
    fontSize: 16,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    minHeight: 44,
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  },
  link: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 56,
  },
  banner: { backgroundColor: "#493A1F", padding: 12 },
});




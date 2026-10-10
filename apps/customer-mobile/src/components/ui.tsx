import React, { useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
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
  type TextInputProps,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useApp } from "../state/Providers";
// RideGrid premium design system (mirrors app/globals.css --rg-* tokens on
// web) — a single source of truth so every screen stays in sync. Update
// values here rather than hardcoding hex in a screen.
export const theme = {
  font: Platform.select({
    ios: "System",
    android: "sans-serif",
    default: "Arial",
  }),
  ink: "#0E1116",
  muted: "#6B7280",
  brand: "#E5192B",
  brandDark: "#B90F1E",
  brandSoft: "#FDECEE",
  purple: "#7C3AED",
  blue: "#2563EB",
  gold: "#B7791F",
  success: "#16A34A",
  successSoft: "#E8F7EE",
  surface: "#FFFFFF",
  paper: "#FFFFFF",
  field: "#F6F7F9",
  line: "#ECEEF2",
  radius: 18,
  spacing: 16,
};
// One soft elevation used by every card so the whole app feels consistent.
export const shadow = {
  shadowColor: "#101828",
  shadowOpacity: 0.07,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
} as const;
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.paper },
  content: {
    padding: 18,
    paddingBottom: 40,
    gap: 16,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  title: {
    fontFamily: theme.font,
    fontSize: 26,
    fontWeight: "800",
    color: theme.ink,
    letterSpacing: -0.6,
    lineHeight: 32,
  },
  subtitle: {
    fontFamily: theme.font,
    fontSize: 14,
    lineHeight: 20,
    color: theme.muted,
  },
  card: {
    backgroundColor: theme.surface,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.line,
    gap: 12,
    ...shadow,
  },
  heading: {
    fontFamily: theme.font,
    fontSize: 18,
    fontWeight: "700",
    color: theme.ink,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: theme.font,
    fontSize: 15,
    lineHeight: 22,
    color: theme.ink,
  },
  small: {
    fontFamily: theme.font,
    fontSize: 13,
    lineHeight: 19,
    color: theme.muted,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  button: {
    minHeight: 52,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: theme.brand,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  buttonText: {
    fontFamily: theme.font,
    fontSize: 16,
    fontWeight: "700",
    color: "white",
    letterSpacing: 0.1,
  },
  input: {
    fontFamily: theme.font,
    backgroundColor: theme.field,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    minHeight: 52,
    fontSize: 16,
    color: theme.ink,
  },
  error: { color: "#DC2626", fontSize: 14, lineHeight: 20 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 40,
    justifyContent: "center",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.surface,
  },
  chipActive: { backgroundColor: theme.brand, borderColor: theme.brand },
});
// `footer` pins a call-to-action under the scrolling content (listing, review).
// `header` replaces the plain title block when a screen draws its own heading.
export function Screen({
  title,
  subtitle,
  children,
  refreshing,
  onRefresh,
  footer,
  header,
}: React.PropsWithChildren<{
  title: string;
  subtitle?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  footer?: React.ReactNode;
  header?: React.ReactNode;
}>) {
  const { online } = useApp();
  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                tintColor={theme.brand}
                refreshing={!!refreshing}
                onRefresh={onRefresh}
              />
            ) : undefined
          }
        >
          {!online && (
            <Text accessibilityRole="alert" style={styles.error}>
              You are offline. Saved information may be out of date.
            </Text>
          )}
          {header ?? (
            <View style={{ gap: 4 }}>
              <Text accessibilityRole="header" style={styles.title}>
                {title}
              </Text>
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
          )}
          {children}
        </ScrollView>
        {footer && (
          <View
            style={{
              paddingHorizontal: 18,
              paddingTop: 12,
              paddingBottom: 12,
              gap: 8,
              backgroundColor: theme.surface,
              borderTopWidth: 1,
              borderTopColor: theme.line,
            }}
          >
            {footer}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export const Card = ({ children }: React.PropsWithChildren) => (
  <View style={styles.card}>{children}</View>
);
// secondary: white button with a hairline border. outline: white button with a red
// border and red text (the reference's "Sign In" / "View Details"). compact: the small
// red "Book Now" size used inside list cards.
export function Button({
  title,
  onPress,
  disabled = false,
  secondary = false,
  outline = false,
  compact = false,
  busy = false,
  icon,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  outline?: boolean;
  compact?: boolean;
  busy?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
}) {
  const plain = secondary || outline;
  const textColor = outline ? theme.brand : secondary ? theme.ink : "white";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || busy, busy }}
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        styles.button,
        compact && { minHeight: 40, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12 },
        plain
          ? {
              backgroundColor: theme.surface,
              borderWidth: outline ? 1.5 : 1,
              borderColor: outline ? theme.brand : theme.line,
            }
          : {
              shadowColor: theme.brand,
              shadowOpacity: 0.28,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: compact ? 2 : 4,
            },
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 },
        (disabled || busy) && { opacity: 0.5 },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={plain ? theme.brand : "white"} />
      ) : (
        <>
          <Text
            style={[
              styles.buttonText,
              { color: textColor },
              compact && { fontSize: 14 },
            ]}
          >
            {title}
          </Text>
          {icon && (
            <Ionicons name={icon} size={compact ? 15 : 18} color={textColor} />
          )}
        </>
      )}
    </Pressable>
  );
}
export function Field({ label, secureTextEntry, ...props }: TextInputProps & { label: string }) {
  const [shown, setShown] = useState(false);
  return (
    <View style={{ gap: 7 }}>
      <Text style={[styles.small, { fontWeight: "600", color: theme.ink }]}>{label}</Text>
      <View style={{ justifyContent: "center" }}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor="#98A2B3"
          style={[styles.input, secureTextEntry ? { paddingRight: 52 } : null]}
          secureTextEntry={secureTextEntry && !shown}
          {...props}
        />
        {secureTextEntry && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={shown ? "Hide password" : "Show password"}
            onPress={() => setShown((v) => !v)}
            hitSlop={8}
            style={{ position: "absolute", right: 6, width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name={shown ? "eye-off-outline" : "eye-outline"} size={20} color={theme.muted} />
          </Pressable>
        )}
      </View>
    </View>
  );
}
export const ErrorText = ({ error }: { error: unknown }) =>
  error ? (
    <Text accessibilityRole="alert" style={styles.error}>
      {error instanceof Error ? error.message : String(error)}
    </Text>
  ) : null;
export const Loading = () => (
  <Card>
    <ActivityIndicator color={theme.brand} />
    <Text style={styles.small}>Loading your latest information...</Text>
  </Card>
);
export function Empty({
  title,
  body,
  icon = "sparkles-outline",
  children,
}: React.PropsWithChildren<{
  title: string;
  body: string;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
}>) {
  return (
    <View style={[styles.card, { alignItems: "center", paddingVertical: 28 }]}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: theme.brandSoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={28} color={theme.brand} />
      </View>
      <Text style={[styles.heading, { textAlign: "center" }]}>{title}</Text>
      <Text style={[styles.subtitle, { textAlign: "center" }]}>{body}</Text>
      {children && <View style={{ alignSelf: "stretch", gap: 10, marginTop: 4 }}>{children}</View>}
    </View>
  );
}
export function SignedIn({ children }: React.PropsWithChildren) {
  const { session, ready } = useApp();
  return !ready ? (
    <Loading />
  ) : session ? (
    <>{children}</>
  ) : (
    <Empty
      icon="person-circle-outline"
      title="Your journeys, together."
      body="Sign in to manage bookings and your account."
    >
      <Button title="Sign in" onPress={() => router.push("/login")} />
    </Empty>
  );
}
export function Chips({
  values,
  value,
  onChange,
  format = (s: string) => s.replaceAll("_", " "),
}: {
  values: string[];
  value: string;
  onChange: (s: string) => void;
  format?: (s: string) => string;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {values.map((s) => (
        <Pressable
          key={s}
          accessibilityRole="button"
          accessibilityState={{ selected: value === s }}
          onPress={() => onChange(s)}
          style={[styles.chip, value === s && styles.chipActive]}
        >
          <Text
            style={{
              color: value === s ? "white" : theme.ink,
              fontWeight: "600",
              fontSize: 14,
            }}
          >
            {format(s)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

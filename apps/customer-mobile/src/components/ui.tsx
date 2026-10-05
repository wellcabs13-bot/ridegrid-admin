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
  ink: "#0F172A",
  muted: "#667085",
  brand: "#E31B23",
  brandDark: "#B8121A",
  brandSoft: "#FDECEC",
  purple: "#6D28D9",
  gold: "#B7791F",
  success: "#15803D",
  surface: "#FFFFFF",
  paper: "#F4F5F8",
  field: "#F7F8FA",
  line: "#E6E8EE",
  radius: 20,
  spacing: 16,
};
// One soft elevation used by every card so the whole app feels consistent.
export const shadow = {
  shadowColor: "#101828",
  shadowOpacity: 0.08,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
} as const;
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.paper },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  title: {
    fontFamily: theme.font,
    fontSize: 28,
    fontWeight: "800",
    color: theme.ink,
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  subtitle: {
    fontFamily: theme.font,
    fontSize: 15,
    lineHeight: 22,
    color: theme.muted,
  },
  card: {
    backgroundColor: theme.surface,
    padding: 18,
    borderRadius: 20,
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
    minHeight: 54,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
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
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.surface,
  },
  chipActive: { backgroundColor: theme.brand, borderColor: theme.brand },
});
export function Screen({
  title,
  subtitle,
  children,
  refreshing,
  onRefresh,
}: React.PropsWithChildren<{
  title: string;
  subtitle?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
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
          <View style={{ gap: 6 }}>
            <Text accessibilityRole="header" style={styles.title}>
              {title}
            </Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export const Card = ({ children }: React.PropsWithChildren) => (
  <View style={styles.card}>{children}</View>
);
export function Button({
  title,
  onPress,
  disabled = false,
  secondary = false,
  busy = false,
  icon,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  busy?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || busy, busy }}
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        styles.button,
        secondary
          ? {
              backgroundColor: theme.surface,
              borderWidth: 1,
              borderColor: theme.line,
            }
          : {
              shadowColor: theme.brand,
              shadowOpacity: 0.28,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: 4,
            },
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 },
        (disabled || busy) && { opacity: 0.5 },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={secondary ? theme.brand : "white"} />
      ) : (
        <>
          <Text
            style={[styles.buttonText, secondary && { color: theme.ink }]}
          >
            {title}
          </Text>
          {icon && (
            <Ionicons
              name={icon}
              size={18}
              color={secondary ? theme.ink : "white"}
            />
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
export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <Text style={styles.heading}>{title}</Text>
      <Text style={styles.subtitle}>{body}</Text>
    </Card>
  );
}
export function SignedIn({ children }: React.PropsWithChildren) {
  const { session, ready } = useApp();
  return !ready ? (
    <Loading />
  ) : session ? (
    <>{children}</>
  ) : (
    <Card>
      <Text style={styles.heading}>Your journeys, together.</Text>
      <Text style={styles.subtitle}>
        Sign in to manage bookings and your account.
      </Text>
      <Button title="Sign in" onPress={() => router.push("/login")} />
    </Card>
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

import React from "react";
import { LinearGradient } from "expo-linear-gradient";
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
  ink: "#F5F5F7",
  muted: "#9A9AA2",
  brand: "#EF4444",
  brandDark: "#B91C1C",
  purple: "#9F1239",
  gold: "#F2CD88",
  success: "#62E2B1",
  surface: "#1C1C21",
  paper: "#0A0A0C",
  line: "#2A2A30",
  radius: 20,
  spacing: 16,
};
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.paper },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 18,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  title: {
    fontFamily: Platform.select({
      ios: "System",
      android: "sans-serif",
      default: "Arial",
    }),
    fontSize: 30,
    fontWeight: "800",
    color: theme.ink,
    letterSpacing: -0.7,
  },
  subtitle: {
    fontFamily: theme.font,
    fontSize: 16,
    lineHeight: 24,
    color: theme.muted,
  },
  card: {
    backgroundColor: theme.surface,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.line,
    gap: 12,
  },
  heading: {
    fontFamily: theme.font,
    fontSize: 20,
    fontWeight: "700",
    color: theme.ink,
  },
  body: {
    fontFamily: theme.font,
    fontSize: 16,
    lineHeight: 24,
    color: theme.ink,
  },
  small: {
    fontFamily: theme.font,
    fontSize: 13,
    lineHeight: 20,
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
    padding: 15,
    borderRadius: 14,
    backgroundColor: theme.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontFamily: theme.font,
    fontSize: 16,
    fontWeight: "700",
    color: "white",
  },
  input: {
    fontFamily: theme.font,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 12,
    padding: 14,
    minHeight: 52,
    fontSize: 16,
    color: theme.ink,
  },
  error: { color: "#FF8295", fontSize: 15, lineHeight: 22 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.surface,
  },
  chipActive: { backgroundColor: theme.brandDark, borderColor: theme.brand },
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
          <View style={{ gap: 8 }}>
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
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  busy?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || busy, busy }}
      onPress={onPress}
      disabled={disabled || busy}
      style={[
        {
          borderRadius: 14,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: secondary ? theme.line : theme.brand,
        },
        secondary && { backgroundColor: theme.surface },
        (disabled || busy) && { opacity: 0.5 },
      ]}
    >
      <LinearGradient
        colors={
          secondary
            ? [theme.surface, theme.surface]
            : ["#F87171", theme.brand, theme.brandDark]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.button, { backgroundColor: "transparent" }]}
      >
        {busy ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>{title}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={styles.small}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#727C88"
        style={styles.input}
        {...props}
      />
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
}: {
  values: string[];
  value: string;
  onChange: (s: string) => void;
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
            }}
          >
            {s.replaceAll("_", " ")}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

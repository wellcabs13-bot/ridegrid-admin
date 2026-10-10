import { useState } from "react";
import { ImageBackground, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Brand } from "../../components/Premium";
import { router, useLocalSearchParams } from "expo-router";
import {
  Card,
  Field,
  Button,
  ErrorText,
  styles,
  theme,
} from "../../components/ui";
import { post, setSession } from "../../services/api";
import type { Session } from "../../types";
import { useApp } from "../../state/Providers";
export function AuthScreen({ reset = false }: { reset?: boolean }) {
  const params = useLocalSearchParams<{ token?: string }>();
  const { online } = useApp();
  // "welcome" is the splash with Create account / Sign in; the forms sit behind it.
  const [mode, setMode] = useState(reset ? "reset" : "welcome");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");
  const [mobile, setMobile] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  function change(next: string) {
    setMode(next);
    setError("");
    setMessage("");
    setPassword("");
    setConfirm("");
  }
  async function submit() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (mode === "forgot") {
        await post(
          "/api/auth/forgot-password",
          { identifier: email.trim(), role: "CUSTOMER" },
          false,
        );
        setMessage(
          "If your account exists, a reset link has been requested. Contact support if it does not arrive.",
        );
        return;
      }
      if (mode === "reset") {
        if (!params.token)
          throw new Error("Open the reset link supplied for your account.");
        await post(
          "/api/auth/reset-password",
          { token: params.token, password, confirmPassword: confirm },
          false,
        );
        await setSession(null);
        change("login");
        setMessage("Password updated. Sign in with your new password.");
        return;
      }
      if (mode === "register") {
        if (!mobile.trim())
          throw new Error("Enter your mobile number for booking contact.");
        await post(
          "/api/customers",
          { firstName, lastName, email, mobile, password },
          false,
        );
        change("login");
        setMessage("Account created. Sign in to continue.");
        return;
      }
      const result = await post<Session>(
        "/api/auth/login",
        { identifier: email.trim(), password, role: "CUSTOMER" },
        false,
      );
      if (result.user.role !== "CUSTOMER") {
        await post(
          "/api/auth/logout",
          { refreshToken: result.refreshToken },
          false,
        );
        throw new Error("Please use a customer account in this app.");
      }
      await setSession(result);
      setPassword("");
      router.replace("/(tabs)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to continue.");
    } finally {
      setBusy(false);
    }
  }
  const titleText =
    mode === "register"
      ? "Create your account"
      : mode === "forgot"
        ? "Forgot password?"
        : mode === "reset"
          ? "Set a new password"
          : "Welcome back";
  if (mode === "welcome")
    return (
      <ImageBackground
        source={require("../../../assets/journey-night.webp")}
        resizeMode="cover"
        style={{ flex: 1, backgroundColor: "#0A0F1C" }}
      >
        <LinearGradient
          colors={["#0A0F1CCC", "#0A0F1C55", "#0A0F1CE6", "#0A0F1CFA"]}
          locations={[0, 0.35, 0.68, 1]}
          style={{ flex: 1 }}
        >
          <SafeAreaView style={{ flex: 1, paddingHorizontal: 24, paddingBottom: 12 }}>
            <View style={{ alignItems: "center", paddingTop: 36 }}>
              <Brand large light tagline />
            </View>
            <View style={{ flex: 1 }} />
            <View style={{ gap: 10, paddingBottom: 6 }}>
              <Text
                style={{
                  color: "white",
                  fontSize: 32,
                  fontWeight: "800",
                  lineHeight: 38,
                  letterSpacing: -0.8,
                  textAlign: "center",
                }}
              >
                Your Next Ride{"\n"}Is a Better Ride
              </Text>
              <Text style={{ color: "#D5D9E2", fontSize: 14.5, lineHeight: 21, textAlign: "center" }}>
                Book exact cars from trusted vendors with verified drivers and transparent fares.
              </Text>
            </View>
            <View style={{ gap: 12, marginTop: 20 }}>
              <Button title="Create Account" onPress={() => change("register")} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sign In"
                onPress={() => change("login")}
                style={({ pressed }) => [
                  styles.button,
                  {
                    backgroundColor: "#FFFFFF",
                    borderWidth: 1.5,
                    borderColor: "#FFFFFF",
                  },
                  pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                ]}
              >
                <Text style={[styles.buttonText, { color: theme.ink }]}>Sign In</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Continue browsing without an account"
                onPress={() => router.replace("/(tabs)")}
                hitSlop={8}
                style={{ alignItems: "center", paddingVertical: 8 }}
              >
                <Text style={{ color: "#D5D9E2", fontSize: 14, fontWeight: "700" }}>
                  Continue browsing
                </Text>
              </Pressable>
              <Text style={{ color: "#9AA1B2", fontSize: 11.5, lineHeight: 16, textAlign: "center" }}>
                By continuing, you agree to our Terms of Service and Privacy Policy.
              </Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </ImageBackground>
    );
  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
          <ImageBackground source={require("../../../assets/journey-night.webp")} style={{ overflow: "hidden" }}>
            <LinearGradient
              colors={["#0A0F1CF0", "#0A0F1CCC", "#0A0F1CF5"]}
              style={{ paddingTop: 64, paddingHorizontal: 24, paddingBottom: 56, gap: 14 }}
            >
              <Brand large light tagline />
            </LinearGradient>
          </ImageBackground>
          <View
            style={[
              styles.content,
              {
                marginTop: -28,
                gap: 16,
                backgroundColor: theme.surface,
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                paddingTop: 24,
                flexGrow: 1,
              },
            ]}
          >
            {mode !== "reset" && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back"
                onPress={() => change("welcome")}
                hitSlop={10}
                style={{ flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start" }}
              >
                <Ionicons name="chevron-back" size={18} color={theme.muted} />
                <Text style={{ color: theme.muted, fontWeight: "600", fontSize: 13.5 }}>Back</Text>
              </Pressable>
            )}
            <View style={{ gap: 4 }}>
              <Text accessibilityRole="header" style={styles.title}>
                {titleText}
              </Text>
              <Text style={styles.subtitle}>Your next journey starts here.</Text>
            </View>
      <Card>
        {mode === "register" && (
          <>
            <Field
              label="First name"
              value={firstName}
              onChangeText={setFirst}
              autoComplete="given-name"
            />
            <Field
              label="Last name"
              value={lastName}
              onChangeText={setLast}
              autoComplete="family-name"
            />
            <Field
              label="Mobile number"
              value={mobile}
              onChangeText={setMobile}
              keyboardType="phone-pad"
              autoComplete="tel"
            />
          </>
        )}
        {mode !== "reset" && (
          <Field
            label={mode === "register" ? "Email" : "Email or mobile number"}
            value={email}
            onChangeText={setEmail}
            keyboardType={mode === "register" ? "email-address" : "default"}
            autoCapitalize="none"
            autoComplete={mode === "register" ? "email" : "username"}
          />
        )}
        {mode !== "forgot" && (
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
          />
        )}
        {(mode === "register" || mode === "reset") && (
          <Text style={styles.small}>
            Use at least 8 characters, uppercase, lowercase, a number and a
            special character.
          </Text>
        )}
        {mode === "reset" && (
          <Field
            label="Confirm password"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            autoComplete="new-password"
          />
        )}
        <ErrorText error={error} />
        {!!message && (
          <Text accessibilityLiveRegion="polite" style={[styles.body, { color: theme.success, fontWeight: "600" }]}>
            {message}
          </Text>
        )}
        <Button
          title={
            mode === "login"
              ? "Sign In"
              : mode === "register"
                ? "Create Account"
                : mode === "forgot"
                  ? "Request reset link"
                  : "Update password"
          }
          onPress={() => void submit()}
          busy={busy}
          disabled={!online}
        />
        {mode === "login" ? (
          <>
            <Button
              title="Create Account"
              outline
              onPress={() => change("register")}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Forgot password"
              onPress={() => change("forgot")}
              hitSlop={8}
              style={{ alignItems: "center", paddingVertical: 4 }}
            >
              <Text style={{ color: theme.brand, fontWeight: "700", fontSize: 14 }}>
                Forgot password?
              </Text>
            </Pressable>
          </>
        ) : (
          <Button
            title="Back to sign in"
            secondary
            onPress={() => change("login")}
          />
        )}
      </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

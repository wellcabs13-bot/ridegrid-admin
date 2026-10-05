import { useState } from "react";
import { ImageBackground, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Brand } from "../../components/Premium";
import { router, useLocalSearchParams } from "expo-router";
import {
  Card,
  Field,
  Button,
  ErrorText,
  styles,
} from "../../components/ui";
import { post, setSession } from "../../services/api";
import type { Session } from "../../types";
import { useApp } from "../../state/Providers";
export function AuthScreen({ reset = false }: { reset?: boolean }) {
  const params = useLocalSearchParams<{ token?: string }>();
  const { online } = useApp();
  const [mode, setMode] = useState(reset ? "reset" : "login");
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
  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
          <ImageBackground source={require("../../../assets/journey-night.webp")} style={{ overflow: "hidden" }}>
            <LinearGradient
              colors={["#0B1220F0", "#0B1220CC", "#0B1220F5"]}
              style={{ paddingTop: 64, paddingHorizontal: 24, paddingBottom: 56, gap: 14 }}
            >
              <Brand large light />
              <Text style={{ color: "white", fontSize: 26, fontWeight: "800", lineHeight: 32, letterSpacing: -0.5 }}>
                Exact Cars. Real Drivers. Better Rides.
              </Text>
              <Text style={{ color: "#CBD5E1", fontSize: 14, lineHeight: 20 }}>
                Choose the exact car, the exact driver and a transparent fare.
              </Text>
            </LinearGradient>
          </ImageBackground>
          <View style={[styles.content, { marginTop: -32, gap: 16 }]}>
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
          <Text accessibilityLiveRegion="polite" style={styles.body}>
            {message}
          </Text>
        )}
        <Button
          title={
            mode === "login"
              ? "Sign in"
              : mode === "register"
                ? "Create account"
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
              title="Create account"
              secondary
              onPress={() => change("register")}
            />
            <Button
              title="Forgot password"
              secondary
              onPress={() => change("forgot")}
            />
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

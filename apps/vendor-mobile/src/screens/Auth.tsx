import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Button, colors, FadeIn, Field, Label, Notice, Screen } from "../components/ui";
import { post, setSession } from "../services/api";
import { validSession } from "../utils/session";
const ROLE = "VENDOR";
type ChangeRequired = { passwordChangeRequired: true; changeToken: string };
const changeRequired = (v: unknown): v is ChangeRequired =>
  !!v && (v as ChangeRequired).passwordChangeRequired === true && typeof (v as ChangeRequired).changeToken === "string";

const POINTS: [React.ComponentProps<typeof Ionicons>["name"], string][] = [
  ["car-sport", "Manage vehicles & drivers"],
  ["calendar", "Track bookings"],
  ["wallet", "View earnings & settlements"],
];
function Brand() {
  return (
    <FadeIn style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <LinearGradient colors={["#F04B45", "#D32F2F"]} style={{ width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#FFFFFF", fontSize: 30, fontWeight: "900" }}>R</Text>
        </LinearGradient>
        <View>
          <Text style={{ fontSize: 26, fontWeight: "900", color: colors.text }}>RideGrid</Text>
          <Text style={{ fontSize: 14, color: colors.muted, fontWeight: "600" }}>Vendor App</Text>
        </View>
      </View>
      <LinearGradient colors={["#FFE7E6", "#FFF6F2", "#FFFFFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 18, gap: 12, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}>
        <Ionicons name="car-sport" size={110} color="#F7C9C7" style={{ position: "absolute", right: -10, bottom: -18 }} />
        <Text style={{ fontSize: 24, fontWeight: "900", color: colors.text, lineHeight: 30 }}>Grow Your Fleet{"\n"}Grow Your Business</Text>
        {POINTS.map(([icon, text]) => (
          <View key={text} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={icon} size={14} color="#FFFFFF" />
            </View>
            <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>{text}</Text>
          </View>
        ))}
      </LinearGradient>
    </FadeIn>
  );
}

export default function Auth({ mode }: { mode: "login" | "forgot-password" | "reset-password" }) {
  const params = useLocalSearchParams<{ token?: string }>();
  const [identifier, setIdentifier] = useState(""),
    [password, setPassword] = useState(""),
    [confirmPassword, setConfirm] = useState(""),
    [token, setToken] = useState(params.token || ""),
    // Set when the account still has its temporary password.
    [changeToken, setChangeToken] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [success, setSuccess] = useState(false);
  async function signIn(secret: string) {
    const data = await post<unknown>("/api/auth/login", { identifier: identifier.trim(), password: secret, role: ROLE }, false);
    if (changeRequired(data)) {
      setChangeToken(data.changeToken);
      setPassword("");
      setConfirm("");
      setSuccess(true);
      setMessage("Welcome! Set a new password to replace your temporary one.");
      return;
    }
    if (!validSession(data)) {
      const rejected = data as { refreshToken?: unknown } | null;
      if (typeof rejected?.refreshToken === "string")
        await post("/api/auth/logout", { refreshToken: rejected.refreshToken }, false).catch(() => {});
      throw new Error("Sign in with your Vendor account.");
    }
    await setSession(data);
    setPassword("");
    router.replace("/");
  }
  async function submit() {
    setBusy(true);
    setMessage("");
    setSuccess(false);
    try {
      if (changeToken) {
        await post("/api/auth/reset-password", { token: changeToken, password, confirmPassword }, false);
        setChangeToken("");
        await signIn(password);
      } else if (mode === "login") {
        await signIn(password);
      } else if (mode === "forgot-password") {
        await post("/api/auth/forgot-password", { identifier: identifier.trim(), role: ROLE }, false);
        setSuccess(true);
        setMessage("If your account is eligible, check your email for reset instructions.");
      } else {
        await post("/api/auth/reset-password", { token, password, confirmPassword }, false);
        setPassword("");
        setConfirm("");
        setSuccess(true);
        setMessage("Password updated. You can now sign in.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  const settingPassword = !!changeToken || mode === "reset-password";
  const login = mode === "login" && !changeToken;
  const heading = changeToken ? "Set your password" : mode === "forgot-password" ? "Recover access" : "Reset password";
  const sub = changeToken
    ? "Choose a new password to finish signing in."
    : mode === "login"
      ? "Vendor accounts are created by RideGrid after onboarding."
      : mode === "forgot-password"
        ? "Enter your email or mobile number and we’ll email reset instructions."
        : "Enter the reset token from your email and choose a new password.";
  return (
    <Screen title={login ? undefined : heading} header={login ? <></> : undefined}>
      {login && <Brand />}
      <Label muted center={login}>{sub}</Label>
      {!changeToken && mode !== "reset-password" && (
        <Field label="Mobile number or email" hideLabel icon="person-outline" keyboardType="email-address" value={identifier} onChangeText={setIdentifier} />
      )}
      {!changeToken && mode === "reset-password" && <Field label="Reset token from your email" hideLabel icon="key-outline" value={token} onChangeText={setToken} />}
      {(settingPassword || mode === "login") && (
        <Field label={settingPassword ? "New password" : "Password"} hideLabel icon="lock-closed-outline" value={password} onChangeText={setPassword} secret />
      )}
      {settingPassword && <Field label="Confirm password" hideLabel icon="lock-closed-outline" value={confirmPassword} onChangeText={setConfirm} secret />}
      {settingPassword && <Label small muted>Use at least 8 characters with uppercase, lowercase, a number and a special character.</Label>}
      {!!message && <Notice tone={success ? "green" : "red"} icon={success ? "checkmark-circle-outline" : "alert-circle-outline"} text={message} />}
      <Button
        large
        icon={login ? "arrow-forward" : undefined}
        title={changeToken ? "Save password and sign in" : mode === "login" ? "Login" : "Continue"}
        busy={busy}
        onPress={() => void submit()}
      />
      {!changeToken && (
        <Pressable accessibilityRole="link" style={{ alignItems: "center", padding: 12 }} onPress={() => router.push(mode === "login" ? "/forgot-password" : "/login")}>
          <Text style={{ color: colors.brand, fontWeight: "700", fontSize: 15 }}>{mode === "login" ? "Forgot Password?" : "Back to sign in"}</Text>
        </Pressable>
      )}
      {mode === "forgot-password" && (
        <Pressable accessibilityRole="link" style={{ alignItems: "center", padding: 8 }} onPress={() => router.push("/reset-password")}>
          <Text style={{ color: colors.blue, fontWeight: "700" }}>I have a reset token</Text>
        </Pressable>
      )}
    </Screen>
  );
}

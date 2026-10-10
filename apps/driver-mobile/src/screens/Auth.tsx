import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button, colors, Field, Label, Notice, Screen } from "../components/ui";
import { post, setSession } from "../services/api";
import { validSession } from "../utils/session";
const ROLE = "DRIVER";
type ChangeRequired = { passwordChangeRequired: true; changeToken: string };
const changeRequired = (v: unknown): v is ChangeRequired =>
  !!v && (v as ChangeRequired).passwordChangeRequired === true && typeof (v as ChangeRequired).changeToken === "string";

function Brand() {
  return (
    <View style={{ alignItems: "center", gap: 18, paddingTop: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#FFFFFF", fontSize: 30, fontWeight: "900" }}>R</Text>
        </View>
        <View>
          <Text style={{ fontSize: 26, fontWeight: "900", color: colors.text }}>RideGrid</Text>
          <Text style={{ fontSize: 14, color: colors.muted, fontWeight: "600" }}>Driver App</Text>
        </View>
      </View>
      <View style={{ width: "100%", height: 150, borderRadius: 24, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <View style={{ position: "absolute", bottom: -40, width: 340, height: 120, borderRadius: 170, backgroundColor: "#F9D5D4" }} />
        <Ionicons name="car-sport" size={96} color={colors.brand} />
      </View>
    </View>
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
      throw new Error("Sign in with your Driver account.");
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
  const heading = changeToken ? "Set your password" : mode === "login" ? "Drive • Earn • Grow" : mode === "forgot-password" ? "Recover access" : "Reset password";
  const sub = changeToken
    ? "Choose a new password to finish signing in."
    : mode === "login"
      ? "Sign in with the Driver account provided by your registered RideGrid Partner."
      : mode === "forgot-password"
        ? "Enter your email or mobile number and we’ll email reset instructions."
        : "Enter the reset token from your email and choose a new password.";
  return (
    <Screen title={login ? undefined : heading} header={login ? <></> : undefined}>
      {login && <Brand />}
      <View style={{ gap: 6, alignItems: login ? "center" : "flex-start" }}>
        {login && <Text style={{ fontSize: 26, fontWeight: "900", color: colors.text }}>{heading}</Text>}
        <Label muted center={login}>{sub}</Label>
      </View>
      {!changeToken && mode !== "reset-password" && (
        <Field label="Mobile number or email" icon="person-outline" keyboardType="email-address" value={identifier} onChangeText={setIdentifier} />
      )}
      {!changeToken && mode === "reset-password" && <Field label="Reset token from your email" icon="key-outline" value={token} onChangeText={setToken} />}
      {(settingPassword || mode === "login") && (
        <Field label={settingPassword ? "New password" : "Password"} icon="lock-closed-outline" value={password} onChangeText={setPassword} secret />
      )}
      {settingPassword && <Field label="Confirm password" icon="lock-closed-outline" value={confirmPassword} onChangeText={setConfirm} secret />}
      {settingPassword && <Label small muted>Use at least 8 characters with uppercase, lowercase, a number and a special character.</Label>}
      {!!message && <Notice tone={success ? "green" : "red"} icon={success ? "checkmark-circle-outline" : "alert-circle-outline"} text={message} />}
      <Button
        title={changeToken ? "Save password and sign in" : mode === "login" ? "Log In" : "Continue"}
        busy={busy}
        onPress={() => void submit()}
      />
      {!changeToken && (
        <Pressable accessibilityRole="link" style={{ alignItems: "center", padding: 10 }} onPress={() => router.push(mode === "login" ? "/forgot-password" : "/login")}>
          <Text style={{ color: colors.brand, fontWeight: "700", fontSize: 15 }}>{mode === "login" ? "Forgot Password?" : "Back to sign in"}</Text>
        </Pressable>
      )}
      {mode === "forgot-password" && (
        <Pressable accessibilityRole="link" style={{ alignItems: "center", padding: 6 }} onPress={() => router.push("/reset-password")}>
          <Text style={{ color: colors.blue, fontWeight: "700" }}>I have a reset token</Text>
        </Pressable>
      )}
    </Screen>
  );
}

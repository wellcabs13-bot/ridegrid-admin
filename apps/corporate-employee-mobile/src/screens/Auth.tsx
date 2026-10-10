import React, { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, Field, MenuRow, Message, Screen, T, colors } from "../components/ui";
import { post, setSession } from "../services/api";
import { validSession } from "../utils/session";
import { useApp } from "../state/Providers";

const ROLE = "CORPORATE_EMPLOYEE";
type ChangeRequired = { passwordChangeRequired: true; changeToken: string };
const changeRequired = (v: unknown): v is ChangeRequired =>
  !!v && (v as ChangeRequired).passwordChangeRequired === true && typeof (v as ChangeRequired).changeToken === "string";

type Mode = "login" | "forgot-password" | "reset-password";
export default function Auth({ mode }: { mode: Mode }) {
  const { online } = useApp();
  const params = useLocalSearchParams<{ token?: string }>();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirm] = useState("");
  const [token, setToken] = useState(params.token || "");
  // Set when the account still has the temporary password issued by the company admin.
  const [changeToken, setChangeToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok?: boolean }>();

  async function signIn(secret: string) {
    const data = await post<unknown>("/api/auth/login", { identifier: identifier.trim(), password: secret, role: ROLE }, false);
    if (changeRequired(data)) {
      setChangeToken(data.changeToken);
      setPassword("");
      setConfirm("");
      setMessage({ ok: true, text: "Welcome! Set a new password to replace your temporary one." });
      return;
    }
    if (!validSession(data)) {
      // A valid account with another role is signed straight back out.
      const rejected = data as { refreshToken?: unknown } | null;
      if (typeof rejected?.refreshToken === "string") await post("/api/auth/logout", { refreshToken: rejected.refreshToken }, false).catch(() => {});
      throw new Error("Sign in with your corporate employee account. Other RideGrid accounts use their own apps.");
    }
    await setSession(data);
    setPassword("");
    router.replace("/");
  }

  async function submit() {
    setBusy(true);
    setMessage(undefined);
    try {
      if (changeToken) {
        await post("/api/auth/reset-password", { token: changeToken, password, confirmPassword }, false);
        setChangeToken("");
        await signIn(password);
      } else if (mode === "login") {
        await signIn(password);
      } else if (mode === "forgot-password") {
        await post("/api/auth/forgot-password", { identifier: identifier.trim(), role: ROLE }, false);
        setMessage({ ok: true, text: "If your account is eligible, check your email for reset instructions." });
      } else {
        await post("/api/auth/reset-password", { token, password, confirmPassword }, false);
        setPassword("");
        setConfirm("");
        setMessage({ ok: true, text: "Password updated. You can now sign in." });
      }
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Please try again." });
    } finally {
      setBusy(false);
    }
  }

  const settingPassword = !!changeToken || mode === "reset-password";
  const login = mode === "login" && !changeToken;
  const form = (
    <Card>
      {!changeToken && mode !== "reset-password" && <Field label="Work email or mobile number" value={identifier} onChangeText={setIdentifier} email icon="person-outline" placeholder="work@company.com" />}
      {!changeToken && mode === "reset-password" && <Field label="Reset token from your email" value={token} onChangeText={setToken} />}
      {(settingPassword || mode === "login") && <Field label={settingPassword ? "New password" : "Password"} value={password} onChangeText={setPassword} secret icon="lock-closed-outline" />}
      {settingPassword && <Field label="Confirm password" value={confirmPassword} onChangeText={setConfirm} secret icon="lock-closed-outline" />}
      {settingPassword && <T muted size={13}>Use at least 8 characters with uppercase, lowercase, a number and a special character.</T>}
      <Message text={message?.text} tone={message?.ok ? colors.emerald : colors.red} />
      <Button title={changeToken ? "Save password and sign in" : mode === "login" ? "Sign In" : "Continue"} arrow={login} busy={busy} disabled={!online} onPress={() => void submit()} />
      {!online && <T muted size={13}>Reconnect to sign in.</T>}
    </Card>
  );
  const links = !changeToken && (
    <View>
      <MenuRow icon="key-outline" title={mode === "login" ? "Forgot password?" : "Back to sign in"} onPress={() => router.push(mode === "login" ? "/forgot-password" : "/login")} />
      {mode === "forgot-password" && <MenuRow icon="mail-open-outline" title="I have a reset token" onPress={() => router.push("/reset-password")} />}
    </View>
  );
  if (login) {
    // Sign-in follows the reference: centred RideGrid brand, welcome copy, one primary action.
    return (
      <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: colors.surface }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }}>
          <View style={{ alignItems: "center", gap: 6, paddingTop: 24 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: "#fff", fontSize: 26, fontWeight: "900" }}>R</Text>
              </View>
              <Text style={{ color: colors.text, fontSize: 30, fontWeight: "900" }}>RideGrid</Text>
            </View>
            <T muted size={12}>by Wellcabs · Corporate Employee App</T>
          </View>
          <View style={{ alignItems: "center", gap: 4, marginTop: 8 }}>
            <Text style={{ color: colors.text, fontSize: 24, fontWeight: "800" }}>Welcome Back</Text>
            <T muted size={13} center>Sign in to your corporate account. Book rides within your company travel policy.</T>
          </View>
          {form}
          {links}
          <View style={{ flexDirection: "row", gap: 6, justifyContent: "center", alignItems: "center" }}>
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.muted} />
            <T muted size={12}>Secure. Compliant. Trusted by Enterprises.</T>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }
  return (
    <Screen title={changeToken ? "Set your password" : mode === "forgot-password" ? "Recover access" : "Reset password"}>
      {form}
      {links}
    </Screen>
  );
}

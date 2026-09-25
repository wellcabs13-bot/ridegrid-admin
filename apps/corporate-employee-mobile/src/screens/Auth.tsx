import React, { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { Button, Card, Field, MenuRow, Message, Screen, T, colors } from "../components/ui";
import { post, setSession } from "../services/api";
import { validSession } from "../utils/session";
import { useApp } from "../state/Providers";

type Mode = "login" | "forgot-password" | "reset-password";
export default function Auth({ mode }: { mode: Mode }) {
  const { online } = useApp();
  const params = useLocalSearchParams<{ token?: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirm] = useState("");
  const [token, setToken] = useState(params.token || "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok?: boolean }>();
  async function submit() {
    setBusy(true);
    setMessage(undefined);
    try {
      const data = await post<unknown>(`/api/auth/${mode}`, { email: email.trim(), password, confirmPassword, token }, false);
      if (mode === "login") {
        if (!validSession(data)) {
          // A valid account with another role is signed straight back out.
          const rejected = data as { refreshToken?: unknown } | null;
          if (typeof rejected?.refreshToken === "string") await post("/api/auth/logout", { refreshToken: rejected.refreshToken }, false).catch(() => {});
          throw new Error("Sign in with your corporate employee account. Other RideGrid accounts use their own apps.");
        }
        await setSession(data);
        setPassword("");
        router.replace("/");
      } else {
        setPassword("");
        setConfirm("");
        setMessage({ ok: true, text: mode === "forgot-password" ? "If your account is eligible, check your email for reset instructions." : "Password updated. You can now sign in." });
      }
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Please try again." });
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen
      title={mode === "login" ? "Business travel, simplified." : mode === "forgot-password" ? "Recover access" : "Reset password"}
      subtitle={mode === "login" ? "Book rides within your company travel policy." : undefined}
    >
      <Card>
        {mode === "login" && <T muted>Sign in with the work account your company registered with RideGrid.</T>}
        {mode !== "reset-password" && <Field label="Work email" value={email} onChangeText={setEmail} email />}
        {mode === "reset-password" && <Field label="Reset token from your email" value={token} onChangeText={setToken} />}
        {mode !== "forgot-password" && <Field label="Password" value={password} onChangeText={setPassword} secret />}
        {mode === "reset-password" && <Field label="Confirm password" value={confirmPassword} onChangeText={setConfirm} secret />}
        <Message text={message?.text} tone={message?.ok ? colors.emerald : colors.red} />
        <Button title={mode === "login" ? "Sign in" : "Continue"} busy={busy} disabled={!online} onPress={() => void submit()} />
        {!online && <T muted size={13}>Reconnect to sign in.</T>}
      </Card>
      <View>
        <MenuRow icon="key-outline" title={mode === "login" ? "Forgot password?" : "Back to sign in"} onPress={() => router.push(mode === "login" ? "/forgot-password" : "/login")} />
        {mode === "forgot-password" && <MenuRow icon="mail-open-outline" title="I have a reset token" onPress={() => router.push("/reset-password")} />}
      </View>
    </Screen>
  );
}

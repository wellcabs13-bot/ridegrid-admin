import React, { useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import {
  Button,
  Card,
  Field,
  Label,
  LinkButton,
  Screen,
} from "../components/ui";
import { post, setSession } from "../services/api";
import { validSession } from "../utils/session";
import type { Session } from "../types";
export default function Auth({
  mode,
}: {
  mode: "login" | "forgot-password" | "reset-password";
}) {
  const params = useLocalSearchParams<{ token?: string }>();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirmPassword, setConfirm] = useState(""),
    [token, setToken] = useState(params.token || ""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function submit() {
    setBusy(true);
    setMessage("");
    try {
      const data = await post<unknown>(
        `/api/auth/${mode}`,
        { email: email.trim(), password, confirmPassword, token },
        false,
      );
      if (mode === "login") {
        if (!validSession(data)) {
          const rejected = data as { refreshToken?: unknown } | null;
          if (typeof rejected?.refreshToken === "string")
            await post(
              "/api/auth/logout",
              { refreshToken: rejected.refreshToken },
              false,
            ).catch(() => {});
          throw new Error("Sign in with your Vendor account.");
        }
        await setSession(data);
        setPassword("");
        router.replace("/");
      } else {
        setPassword("");
        setConfirm("");
        setMessage(
          mode === "forgot-password"
            ? "If your account is eligible, check your email for reset instructions."
            : "Password updated. You can now sign in.",
        );
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen
      title={
        mode === "login"
          ? "Your operations, connected."
          : mode === "forgot-password"
            ? "Recover access"
            : "Reset password"
      }
    >
      <Card>
        <Label muted>
          Manage your fleet, bookings and people with RideGrid.
        </Label>
        {mode !== "reset-password" && (
          <Field label="Email" value={email} onChangeText={setEmail} />
        )}
        {mode === "reset-password" && (
          <Field
            label="Reset token from your email"
            value={token}
            onChangeText={setToken}
          />
        )}
        {mode !== "forgot-password" && (
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            secret
          />
        )}
        {mode === "reset-password" && (
          <Field
            label="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirm}
            secret
          />
        )}
        {!!message && <Label>{message}</Label>}
        <Button
          title={
            busy ? "Please wait…" : mode === "login" ? "Sign in" : "Continue"
          }
          disabled={busy}
          onPress={submit}
        />
      </Card>
      <LinkButton
        title={mode === "login" ? "Forgot password?" : "Back to sign in"}
        href={mode === "login" ? "/forgot-password" : "/login"}
      />
      {mode === "forgot-password" && (
        <LinkButton title="I have a reset token" href="/reset-password" />
      )}
    </Screen>
  );
}

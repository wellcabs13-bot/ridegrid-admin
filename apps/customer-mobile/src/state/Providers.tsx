import React, { createContext, useContext, useEffect, useState } from "react";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import {
  QueryClient,
  QueryClientProvider,
  onlineManager,
  focusManager,
} from "@tanstack/react-query";
import {
  api,
  currentSession,
  onSession,
  post,
  setSession,
} from "../services/api";
import { sessionStore } from "../storage/session";
import { enablePush, listenForPushTaps, takePushToken } from "../features/notifications/push";
import type { Session, User } from "../types";
const client = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000, gcTime: 300000 },
    mutations: { retry: false },
  },
});
const Context = createContext({
  session: null as Session | null,
  ready: false,
  online: true,
});
export const useApp = () => useContext(Context);
export function Providers({ children }: React.PropsWithChildren) {
  const [session, setCurrent] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(true);
  useEffect(() => {
    let previousId: string | undefined;
    const unsub = onSession((s) => {
      if (s?.user.id && s.user.id !== previousId) void enablePush().catch(() => {});
      if (previousId !== s?.user.id || !s) client.clear();
      previousId = s?.user.id;
      setCurrent(s);
    });
    let live = true;
    void sessionStore
      .read()
      .then(async (stored) => {
        if (!live) return;
        await setSession(stored);
        // Secure storage restoration is enough to show the app. Every API still
        // authenticates server-side; a slow validation must not hold the splash.
        if (live) setReady(true);
        if (stored) await api<User>("/api/auth/me").catch(() => {});
      })
      .catch(() => {
        if (live) setCurrent(null);
      })
      .finally(() => {
        if (live) setReady(true);
      });
    const net = NetInfo.addEventListener((state) => {
      const ok =
        state.isConnected !== false && state.isInternetReachable !== false;
      setOnline(ok);
      onlineManager.setOnline(ok);
    });
    const app = AppState.addEventListener("change", (status) =>
      focusManager.setFocused(status === "active"),
    );
    return () => {
      live = false;
      unsub();
      net();
      app.remove();
    };
  }, []);
  const signedIn = ready && !!session?.user.id;
  useEffect(() => (signedIn ? listenForPushTaps() : undefined), [signedIn]);
  return (
    <QueryClientProvider client={client}>
      <Context.Provider value={{ session, ready, online }}>
        {children}
      </Context.Provider>
    </QueryClientProvider>
  );
}
export async function logout() {
  const token = currentSession()?.refreshToken;
  // The device is signed out first (session and cached data), online or not. Server
  // revocation is then attempted; a failure is reported, never silently claimed.
  await setSession(null);
  client.clear();
  await post("/api/auth/logout", { refreshToken: token, pushToken: takePushToken() }, false).catch(() => {
    throw new Error("Signed out on this device. The server session could not be revoked now and will expire on its own.");
  });
}

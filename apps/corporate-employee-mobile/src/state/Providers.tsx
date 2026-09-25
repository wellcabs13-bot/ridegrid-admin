import React, { createContext, useContext, useEffect, useState } from "react";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { QueryClient, QueryClientProvider, focusManager, onlineManager } from "@tanstack/react-query";
import { api, currentSession, onSession, post, setSession } from "../services/api";
import { sessionStore } from "../storage/session";
import { clearOffline } from "../storage/offline";
import type { Listing, Quote, Search, Session, User } from "../types";

const client = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000, gcTime: 300000 }, mutations: { retry: false } },
});
export type Journey = { search: Search; listing: Listing; quote?: Quote };
const Context = createContext({
  session: null as Session | null,
  ready: false,
  online: true,
  journey: null as Journey | null,
  setJourney: (_: Journey | null) => {},
});
export const useApp = () => useContext(Context);

export function Providers({ children }: React.PropsWithChildren) {
  const [session, setCurrent] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(true);
  const [journey, setJourney] = useState<Journey | null>(null);
  useEffect(() => {
    let previousId: string | undefined;
    const unsub = onSession((s) => {
      if (previousId && previousId !== s?.user.id) void clearOffline(previousId).catch(() => {});
      if (previousId !== s?.user.id || !s) {
        client.clear();
        setJourney(null);
      }
      previousId = s?.user.id;
      setCurrent(s);
    });
    let live = true;
    void sessionStore
      .read()
      .then(async (stored) => {
        if (!live) return;
        await setSession(stored);
        // Restored sessions still authenticate server-side on every call. A role
        // change since the last launch ends the local session.
        if (live) setReady(true);
        if (stored) {
          const user = await api<User>("/api/auth/me").catch(() => null);
          if (user && user.role !== "CORPORATE_EMPLOYEE") await setSession(null);
        }
      })
      .catch(() => {
        if (live) setCurrent(null);
      })
      .finally(() => {
        if (live) setReady(true);
      });
    const net = NetInfo.addEventListener((state) => {
      const ok = state.isConnected !== false && state.isInternetReachable !== false;
      setOnline(ok);
      onlineManager.setOnline(ok);
    });
    const app = AppState.addEventListener("change", (status) => focusManager.setFocused(status === "active"));
    return () => {
      live = false;
      unsub();
      net();
      app.remove();
    };
  }, []);
  return (
    <QueryClientProvider client={client}>
      <Context.Provider value={{ session, ready, online, journey, setJourney }}>{children}</Context.Provider>
    </QueryClientProvider>
  );
}

export async function logout() {
  const token = currentSession()?.refreshToken;
  await setSession(null);
  client.clear();
  // Revocation is attempted; the local session is already gone either way.
  await post("/api/auth/logout", { refreshToken: token }, false).catch(() => {});
}

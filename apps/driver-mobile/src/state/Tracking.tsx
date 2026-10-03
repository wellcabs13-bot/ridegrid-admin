import React, { createContext, useContext, useEffect, useState } from "react";
import { AppState } from "react-native";
import * as Location from "expo-location";
import { useApp } from "./Providers";
import { useDriver } from "../services/driver";
import { api } from "../services/api";
import type { Home } from "../types";
import { activeLocation } from "../utils/trips";
const Context = createContext({ enabled: false, message: "Location sharing is off.", toggle: async () => {}, stop: () => {} });
export const useTracking = () => useContext(Context);
export function Tracking({ children }: React.PropsWithChildren) {
  const { session, online } = useApp(), q = useDriver<Home>("dashboard", "", true);
  const [enabled, setEnabled] = useState(false), [foreground, setForeground] = useState(AppState.currentState === "active"), [message, setMessage] = useState("Location sharing is off.");
  const eligible = (q.data?.active || []).filter(activeLocation);
  // Ambiguous overlapping assignments require Operations to resolve them.
  const tripId = eligible.length === 1 ? eligible[0].trip?.id : undefined;
  useEffect(() => { setEnabled(false); }, [session?.user.id]);
  useEffect(() => { const subscription = AppState.addEventListener("change", s => setForeground(s === "active")); return () => subscription.remove(); }, []);
  useEffect(() => {
    if (!enabled) { setMessage("Location sharing is off."); return; }
    if (!session || !tripId || !online || !foreground) { setMessage(!foreground ? "Paused while the app is in the background." : !online ? "Offline. Location is not being uploaded." : "Waiting for one eligible active trip."); return; }
    let live = true, busy = false;
    const controller = new AbortController();
    async function upload() {
      if (busy) return; busy = true;
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (!permission.granted) { if (live) { setEnabled(false); setMessage("Location permission is off. Navigation by address still works."); } return; }
        const point = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!live || AppState.currentState !== "active") return;
        if (point.mocked) throw new Error("Mocked location cannot be uploaded.");
        await api("/api/driver/location", { method: "POST", signal: controller.signal, body: JSON.stringify({ tripId, latitude: point.coords.latitude, longitude: point.coords.longitude, accuracy: point.coords.accuracy, speed: point.coords.speed != null && point.coords.speed >= 0 ? point.coords.speed : null, heading: point.coords.heading != null && point.coords.heading >= 0 ? point.coords.heading : null }) });
        if (live) setMessage(`Location received by RideGrid at ${new Date().toLocaleTimeString()}.`);
      } catch (e) { if (live) setMessage(e instanceof Error ? e.message : "Location update failed. Retrying while this trip is active."); }
      finally { busy = false; }
    }
    void upload(); const timer = setInterval(() => void upload(), 30000);
    return () => { live = false; clearInterval(timer); controller.abort(); };
  }, [enabled, foreground, online, session?.user.id, tripId]);
  async function toggle() {
    if (enabled) { setEnabled(false); return; }
    try {
      const p = await Location.requestForegroundPermissionsAsync();
      if (!p.granted) { setMessage("Permission denied. You can still navigate by address."); return; }
      setEnabled(true);
    } catch { setMessage("Location is unavailable on this device."); }
  }
  return <Context.Provider value={{ enabled, message, toggle, stop: () => setEnabled(false) }}>{children}</Context.Provider>;
}

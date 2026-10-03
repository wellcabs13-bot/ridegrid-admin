import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { safeRows } from "../utils/offline";
export type OfflineRow = { id: string; bookingNumber?: string; status?: string; pickupDateTime?: string; service?: string };
const prefix = "ridegrid.corporate.list.";
export async function clearOffline(userId: string) {
  const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(`${prefix}${userId}.`));
  await AsyncStorage.multiRemove(keys);
}
// Keeps a 24-hour, display-only snapshot of trip lists for offline viewing.
export function useOfflineRows(userId: string | undefined, section: string, rows: unknown[] | undefined, online: boolean) {
  const [snapshot, setSnapshot] = useState<{ rows: OfflineRow[]; savedAt: number } | null>(null);
  const serialized = rows ? JSON.stringify(rows) : "";
  useEffect(() => {
    let live = true;
    setSnapshot(null);
    if (!userId) return;
    void AsyncStorage.getItem(`${prefix}${userId}.${section}`)
      .then((raw) => {
        if (!raw || !live) return;
        const data = JSON.parse(raw);
        if (data.savedAt > Date.now() - 24 * 3600000 && Array.isArray(data.rows)) setSnapshot(data);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [userId, section, online]);
  useEffect(() => {
    if (!userId || !online || !serialized) return;
    const value = { rows: safeRows(JSON.parse(serialized)).slice(0, 100), savedAt: Date.now() };
    void AsyncStorage.setItem(`${prefix}${userId}.${section}`, JSON.stringify(value)).catch(() => {});
  }, [userId, section, serialized, online]);
  return snapshot;
}

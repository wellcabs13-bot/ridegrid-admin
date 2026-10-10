import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { safeRows } from "../utils/offline";
export type OfflineRow = Record<string, unknown>;
const prefix = "ridegrid.vendor.list.";
export async function clearOffline(userId: string) {
  const keys = (await AsyncStorage.getAllKeys()).filter((key) =>
    key.startsWith(`${prefix}${userId}.`),
  );
  await AsyncStorage.multiRemove(keys);
}
export function useOfflineRows(
  userId: string | undefined,
  section: string,
  rows: unknown[],
  online: boolean,
) {
  const [snapshot, setSnapshot] = useState<{
    rows: OfflineRow[];
    savedAt: number;
  } | null>(null);
  const serialized = JSON.stringify(rows);
  useEffect(() => {
    let live = true;
    setSnapshot(null);
    if (!userId) return;
    const key = `${prefix}${userId}.${section}`;
    void AsyncStorage.getItem(key)
      .then((raw) => {
        if (raw && live) {
          const data = JSON.parse(raw);
          if (
            data.savedAt > Date.now() - 24 * 3600000 &&
            Array.isArray(data.rows)
          )
            setSnapshot(data);
        }
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [userId, section, online]);
  useEffect(() => {
    if (!userId || !online || !rows.length) return;
    const value = {
      rows: safeRows(section, JSON.parse(serialized)).slice(0, 100),
      savedAt: Date.now(),
    };
    void AsyncStorage.setItem(
      `${prefix}${userId}.${section}`,
      JSON.stringify(value),
    ).catch(() => {});
  }, [userId, section, serialized, online]);
  return snapshot;
}

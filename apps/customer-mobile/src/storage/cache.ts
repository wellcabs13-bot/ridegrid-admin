import AsyncStorage from "@react-native-async-storage/async-storage";
import { publicCacheFresh } from "../utils/offline";
// Only public marketplace reference data is persisted. No addresses, profiles or bookings.
const key = "ridegrid.public-options.v1";
export async function readOptions<T>(): Promise<T | undefined> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return;
    const value = JSON.parse(raw);
    if (!publicCacheFresh(value.at)) return;
    return value.data;
  } catch {
    return;
  }
}
export async function writeOptions(data: unknown) {
  await AsyncStorage.setItem(
    key,
    JSON.stringify({ at: Date.now(), data }),
  ).catch(() => {});
}

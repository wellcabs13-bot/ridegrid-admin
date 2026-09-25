import * as SecureStore from "expo-secure-store";
import type { Session } from "../types";
import { validSession } from "../utils/session";
export { validSession } from "../utils/session";
const KEY = "ridegrid.corporate.session";
export const sessionStore = {
  async read(): Promise<Session | null> {
    try {
      const raw = await SecureStore.getItemAsync(KEY);
      const value = raw ? JSON.parse(raw) : null;
      return validSession(value) ? value : null;
    } catch {
      return null;
    }
  },
  async write(session: Session | null) {
    if (!(await SecureStore.isAvailableAsync())) {
      if (session) throw new Error("Secure account storage requires an Android or iOS build.");
      return;
    }
    if (session)
      await SecureStore.setItemAsync(KEY, JSON.stringify(session), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    else await SecureStore.deleteItemAsync(KEY);
  },
};

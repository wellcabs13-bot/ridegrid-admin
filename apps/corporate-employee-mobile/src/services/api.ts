import type { Session } from "../types";
import { sessionStore, validSession } from "../storage/session";
import { normalizeError } from "./errors";
export const baseURL = (process.env.EXPO_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
let session: Session | null = null;
let listener: (s: Session | null) => void = () => {};
let refresh: Promise<void> | null = null;
let generation = 0;
let storageWrite: Promise<void> = Promise.resolve();
export function onSession(fn: typeof listener) {
  listener = fn;
  return () => {
    listener = () => {};
  };
}
export function currentSession() {
  return session;
}
export async function setSession(next: Session | null) {
  const version = ++generation;
  storageWrite = storageWrite.catch(() => {}).then(() => sessionStore.write(next));
  await storageWrite;
  if (version !== generation) return;
  session = next;
  listener(next);
}
async function raw(path: string, init: RequestInit = {}) {
  if (!/^https:\/\//.test(baseURL) && !(typeof __DEV__ !== "undefined" && __DEV__ && /^http:\/\//.test(baseURL)))
    throw new Error("This app cannot connect to RideGrid. Please contact support.");
  const controller = new AbortController();
  const abort = () => controller.abort();
  init.signal?.addEventListener("abort", abort);
  if (init.signal?.aborted) controller.abort();
  const timeout = setTimeout(abort, 20000);
  try {
    return await fetch(`${baseURL}${path}`, {
      ...init,
      credentials: "omit",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...init.headers },
    });
  } catch {
    throw normalizeError(0);
  } finally {
    clearTimeout(timeout);
    init.signal?.removeEventListener("abort", abort);
  }
}
async function refreshSession() {
  const before = generation;
  const token = session?.refreshToken;
  if (!token) throw normalizeError(401);
  const response = await raw("/api/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken: token }) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !validSession(body.data)) {
    if ((response.status === 401 || response.ok) && before === generation) await setSession(null);
    throw normalizeError(response.status);
  }
  if (before === generation) await setSession(body.data);
}
export async function api<T>(path: string, init: RequestInit = {}, authenticated = true): Promise<T> {
  if (authenticated && !session) throw normalizeError(401);
  const userId = session?.user.id;
  const send = () =>
    raw(path, {
      ...init,
      headers: { ...init.headers, ...(authenticated && session ? { Authorization: `Bearer ${session.accessToken}` } : {}) },
    });
  let response = await send();
  if (response.status === 401 && authenticated && session) {
    refresh ??= refreshSession().finally(() => {
      refresh = null;
    });
    await refresh;
    if (!session || session.user.id !== userId) throw normalizeError(401);
    response = await send();
  }
  const body = await response.json().catch(() => ({}));
  // A response for a previous account must never reach the current one.
  if (authenticated && session?.user.id !== userId) throw normalizeError(401);
  if (!response.ok || body.success === false) {
    if (response.status === 401 && authenticated) await setSession(null);
    throw normalizeError(response.status, body);
  }
  return body.data as T;
}
export const post = <T>(path: string, body: unknown, authenticated = true) =>
  api<T>(path, { method: "POST", body: JSON.stringify(body) }, authenticated);
export const corp = <T>(section: string, query = "", signal?: AbortSignal) =>
  api<T>(`/api/mobile/corporate/${section}${query}`, { signal });
export const corpPost = <T>(section: string, body: unknown) => post<T>(`/api/mobile/corporate/${section}`, body);

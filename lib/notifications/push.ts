import "server-only";
import { prisma } from "@/lib/prisma";
import { pushConfig } from "./channels";
import type { NotificationTarget } from "./NotificationTargets";

// Device push: Expo push tokens registered by the four signed-in apps, delivered via
// the Expo Push Service (which uses each app's FCM V1 credentials in EAS for Android).
// Push only mirrors an in-app notification that was already stored; it never carries
// state the apps act on. A tap opens a screen that re-reads everything from the server.

export const PUSH_APPS = ["com.ridegrid.customer", "com.ridegrid.vendor", "com.ridegrid.driver", "com.ridegrid.corporate"] as const;
export type PushApp = (typeof PUSH_APPS)[number];

const TOKEN = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{10,200}\]$/;
export const isExpoPushToken = (v: unknown): v is string => typeof v === "string" && v.length <= 250 && TOKEN.test(v);

// Minimal typed view of the PushDevice model (migration 20260930120000_push_devices).
type DeviceRow = { id: string; userId: string; token: string; isActive: boolean };
type PushDeviceDelegate = {
  upsert(args: { where: { token: string }; create: Record<string, unknown>; update: Record<string, unknown> }): Promise<DeviceRow>;
  updateMany(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<{ count: number }>;
  findMany(args: { where: Record<string, unknown>; select: { userId: true; token: true }; take?: number }): Promise<{ userId: string; token: string }[]>;
};
const devices = () => (prisma as unknown as { pushDevice: PushDeviceDelegate }).pushDevice;

// Binds the token to the authenticated user only. The user id always comes from the
// session; a token previously held by another account moves to the current one, so a
// shared or re-used phone never keeps delivering the previous user's notifications.
export async function registerPushDevice(userId: string, token: string, app: PushApp, platform: "android" | "ios") {
  const now = new Date();
  await devices().upsert({
    where: { token },
    create: { userId, token, app, platform, isActive: true, lastSeenAt: now },
    update: { userId, app, platform, isActive: true, lastSeenAt: now, deactivatedAt: null, failureReason: null },
  });
}

// Deactivates the token only when it belongs to this user (logout on this device).
export async function deactivatePushDevice(userId: string, token: string, reason = "SIGNED_OUT") {
  const r = await devices().updateMany({ where: { token, userId, isActive: true }, data: { isActive: false, deactivatedAt: new Date(), failureReason: reason } });
  return r.count;
}

// Every device of an account (account deactivation / password change).
export async function deactivateUserPushDevices(userId: string, reason: string) {
  await devices().updateMany({ where: { userId, isActive: true }, data: { isActive: false, deactivatedAt: new Date(), failureReason: reason } });
}

export type PushNotice = { userId: string; title: string; message: string; target?: NotificationTarget | null };

// Only the navigation hint travels in the payload: no amounts, identities or statuses.
export function pushData(target?: NotificationTarget | null): Record<string, string> {
  if (!target) return {};
  if (target.type === "booking") return { kind: "booking", bookingId: target.id };
  return { kind: target.type };
}

const EXPO_URL = "https://exp.host/--/api/v2/push/send";
const TIMEOUT_MS = 8000;

type Ticket = { status?: string; details?: { error?: string } };

// Sends to the users' active devices. Never throws: push is best-effort on top of the
// stored in-app notification, and a provider outage must not fail the caller.
export async function sendPush(notices: PushNotice[], fetchImpl?: typeof fetch): Promise<{ sent: number; failed: number; deactivated: number; status: "SENT" | "NOT_CONFIGURED" | "FAILED" | "NO_DEVICES" }> {
  const cfg = pushConfig();
  if (!cfg.ok || !notices.length) return { sent: 0, failed: 0, deactivated: 0, status: cfg.ok ? "NO_DEVICES" : "NOT_CONFIGURED" };
  try {
    const userIds = [...new Set(notices.map((n) => n.userId))].slice(0, 500);
    const rows = await devices().findMany({ where: { userId: { in: userIds }, isActive: true }, select: { userId: true, token: true }, take: 2000 });
    const messages = notices.flatMap((n) => rows.filter((r) => r.userId === n.userId).map((r) => ({
      to: r.token, title: n.title.slice(0, 120), body: n.message.slice(0, 240), data: pushData(n.target), sound: "default", priority: "high", channelId: "default",
    })));
    if (!messages.length) return { sent: 0, failed: 0, deactivated: 0, status: "NO_DEVICES" };
    let sent = 0, failed = 0;
    const dead: string[] = [];
    for (let i = 0; i < messages.length; i += 100) {
      const batch = messages.slice(i, i + 100);
      try {
        const res = await (fetchImpl ?? globalThis.fetch)(EXPO_URL, {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json", ...(cfg.accessToken ? { Authorization: `Bearer ${cfg.accessToken}` } : {}) },
          body: JSON.stringify(batch),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        const json = (await res.json().catch(() => null)) as { data?: Ticket[] } | null;
        if (!res.ok || !Array.isArray(json?.data)) { failed += batch.length; console.error(`[Push] Expo push rejected a batch (HTTP ${res.status}).`); continue; }
        json.data.forEach((ticket, k) => {
          if (ticket.status === "ok") sent++;
          else { failed++; if (ticket.details?.error === "DeviceNotRegistered") dead.push(batch[k].to); }
        });
      } catch {
        failed += batch.length;
        console.error("[Push] Expo push service unreachable or timed out.");
      }
    }
    // Uninstalled apps / expired tokens are retired so they are never retried.
    if (dead.length) await devices().updateMany({ where: { token: { in: dead } }, data: { isActive: false, deactivatedAt: new Date(), failureReason: "DEVICE_NOT_REGISTERED" } });
    return { sent, failed, deactivated: dead.length, status: failed && !sent ? "FAILED" : "SENT" };
  } catch (error) {
    console.error("[Push] delivery skipped:", error instanceof Error ? error.message.slice(0, 120) : "unknown error");
    return { sent: 0, failed: notices.length, deactivated: 0, status: "FAILED" };
  }
}

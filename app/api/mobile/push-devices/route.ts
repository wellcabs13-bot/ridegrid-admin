import { NextRequest, NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";
import { requestUser } from "@/lib/request-access";
import { pushReady } from "@/lib/notifications/channels";
import { PUSH_APPS, type PushApp, deactivatePushDevice, isExpoPushToken, registerPushDevice } from "@/lib/notifications/push";

// Device push registration for the four signed-in apps. The account is always the
// authenticated caller; a user id in the body is never read. Each app may register
// only for the roles it serves, so a session cannot attach push to the wrong app.
const APP_ROLES: Record<PushApp, UserRole[]> = {
  "com.ridegrid.customer": ["CUSTOMER"],
  "com.ridegrid.vendor": ["VENDOR"],
  "com.ridegrid.driver": ["DRIVER"],
  "com.ridegrid.corporate": ["CORPORATE_EMPLOYEE", "CORPORATE_ADMIN"],
};

const reply = (status: number, body: Record<string, unknown>) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function input(request: NextRequest) {
  const user = await requestUser(request);
  if (!user) return { error: reply(401, { success: false, message: "Please sign in." }) };
  const origin = request.headers.get("origin");
  if ((origin && origin !== request.nextUrl.origin) || request.headers.get("sec-fetch-site") === "cross-site")
    return { error: reply(403, { success: false, message: "Cross-site changes are not allowed." }) };
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: reply(400, { success: false, message: "Invalid request." }) };
  const { token } = body as Record<string, unknown>;
  if (!isExpoPushToken(token)) return { error: reply(400, { success: false, message: "Invalid device token." }) };
  return { user, token, body: body as Record<string, unknown> };
}

export async function POST(request: NextRequest) {
  try {
    const r = await input(request);
    if ("error" in r) return r.error;
    const app = r.body.app, platform = r.body.platform;
    if (typeof app !== "string" || !(PUSH_APPS as readonly string[]).includes(app)) return reply(400, { success: false, message: "Unknown app." });
    if (platform !== "android" && platform !== "ios") return reply(400, { success: false, message: "Unsupported platform." });
    if (!APP_ROLES[app as PushApp].includes(r.user.role)) return reply(403, { success: false, message: "This account cannot use this app." });
    // Push not configured: nothing is stored and the app keeps using the in-app inbox.
    if (!pushReady()) return reply(200, { success: true, data: { registered: false, reason: "NOT_CONFIGURED" } });
    await registerPushDevice(r.user.id, r.token, app as PushApp, platform);
    return reply(200, { success: true, data: { registered: true } });
  } catch (error) {
    console.error("[Push] device registration failed:", error instanceof Error ? error.message.slice(0, 120) : "unknown");
    return reply(503, { success: false, message: "Notifications could not be enabled right now. Please try again later." });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const r = await input(request);
    if ("error" in r) return r.error;
    await deactivatePushDevice(r.user.id, r.token);
    return reply(200, { success: true, data: { registered: false } });
  } catch (error) {
    console.error("[Push] device removal failed:", error instanceof Error ? error.message.slice(0, 120) : "unknown");
    return reply(503, { success: false, message: "Please try again." });
  }
}

// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Email (Zoho CPaaS) and device push (Expo → FCM): configuration-driven status, the
// provider adapters, and device registration bound to the signed-in account.

const m = vi.hoisted(() => ({
  requestUser: vi.fn(),
  getUserId: vi.fn(),
  logout: vi.fn(),
  upsert: vi.fn(),
  updateMany: vi.fn(),
  notificationLog: vi.fn(),
}));
vi.mock("@/lib/request-access", () => ({ requestUser: m.requestUser }));
vi.mock("@/lib/auth/refresh-token", () => ({ refreshTokenService: { getUserId: m.getUserId } }));
vi.mock("@/lib/auth/auth", () => ({ authService: { logout: m.logout } }));
vi.mock("@/lib/prisma", () => ({ prisma: { pushDevice: { upsert: m.upsert, updateMany: m.updateMany, findMany: vi.fn() }, notificationLog: { create: m.notificationLog } } }));

import { emailConfig, pushConfig } from "@/lib/notifications/channels";
import { ZohoCpaasEmailProvider, renderEmailHtml } from "@/lib/notifications/email";
import { isExpoPushToken, sendPush } from "@/lib/notifications/push";
import { channelStatus } from "@/lib/services/admin/PlatformAdminService";
import { DELETE, POST } from "@/app/api/mobile/push-devices/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as mobileConfig } from "@/app/api/mobile/config/route";

const TOKEN = "ExponentPushToken[abcdefghijklmnop]";
const EMAIL_ENV = { ZOHO_CPAAS_EMAIL_API_KEY: "zoho-key-123", EMAIL_FROM_ADDRESS: "service@wellcabs.com" };
const req = (method: string, body: unknown, headers: Record<string, string> = {}) =>
  new NextRequest("https://ridegrid.test/api/mobile/push-devices", { method, body: JSON.stringify(body), headers: { "Content-Type": "application/json", ...headers } });

beforeEach(() => { vi.resetAllMocks(); m.upsert.mockResolvedValue({}); m.updateMany.mockResolvedValue({ count: 1 }); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("channel status comes from real configuration", () => {
  it("reports email and push NOT_CONFIGURED without credentials, SMS/WhatsApp always NOT_CONFIGURED", () => {
    vi.stubEnv("ZOHO_CPAAS_EMAIL_API_KEY", ""); vi.stubEnv("PUSH_NOTIFICATIONS_ENABLED", "");
    const status = Object.fromEntries(channelStatus().map((c) => [c.channel, c.status]));
    expect(status).toEqual({ IN_APP: "ACTIVE", EMAIL: "NOT_CONFIGURED", SMS: "NOT_CONFIGURED", WHATSAPP: "NOT_CONFIGURED", DEVICE_PUSH: "NOT_CONFIGURED" });
  });
  it("reports ACTIVE only when configured, never exposing the key", () => {
    for (const [k, v] of Object.entries(EMAIL_ENV)) vi.stubEnv(k, v);
    vi.stubEnv("PUSH_NOTIFICATIONS_ENABLED", "true");
    const channels = channelStatus();
    expect(channels.find((c) => c.channel === "EMAIL")?.status).toBe("ACTIVE");
    expect(channels.find((c) => c.channel === "DEVICE_PUSH")?.status).toBe("ACTIVE");
    expect(JSON.stringify(channels)).not.toContain("zoho-key-123");
  });
  it("accepts only a wellcabs.com sender and an https Zoho endpoint", () => {
    vi.stubEnv("ZOHO_CPAAS_EMAIL_API_KEY", "k");
    vi.stubEnv("EMAIL_FROM_ADDRESS", "service@gmail.com");
    expect(emailConfig().ok).toBe(false);
    vi.stubEnv("EMAIL_FROM_ADDRESS", "service@wellcabs.com");
    vi.stubEnv("ZOHO_CPAAS_EMAIL_API_URL", "http://cpaas.zoho.com/v1.1/email");
    expect(emailConfig().ok).toBe(false);
    vi.stubEnv("ZOHO_CPAAS_EMAIL_API_URL", "https://evil.example.com/v1.1/email");
    expect(emailConfig().ok).toBe(false);
    vi.stubEnv("ZOHO_CPAAS_EMAIL_API_URL", "https://cpaas.zoho.in/v1.1/email");
    expect(emailConfig().ok).toBe(true);
  });
  it("push needs the explicit FCM/EAS confirmation flag", () => {
    vi.stubEnv("PUSH_NOTIFICATIONS_ENABLED", "yes");
    expect(pushConfig().ok).toBe(false);
    vi.stubEnv("PUSH_NOTIFICATIONS_ENABLED", "true");
    expect(pushConfig().ok).toBe(true);
  });
  it("the mobile config advertises push registration only when configured", async () => {
    vi.stubEnv("PUSH_NOTIFICATIONS_ENABLED", "");
    expect((await (await mobileConfig()).json()).data.pushRegistration).toBe(false);
    vi.stubEnv("PUSH_NOTIFICATIONS_ENABLED", "true");
    expect((await (await mobileConfig()).json()).data.pushRegistration).toBe(true);
  });
});

describe("Zoho CPaaS email provider", () => {
  it("returns NOT_CONFIGURED without calling the network", async () => {
    vi.stubEnv("ZOHO_CPAAS_EMAIL_API_KEY", "");
    const fetchMock = vi.fn();
    const r = await new ZohoCpaasEmailProvider(fetchMock).send({ to: { address: "a@b.com" }, subject: "s", text: "t" });
    expect(r.status).toBe("NOT_CONFIGURED");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("rejects an invalid recipient and reports timeouts as retryable", async () => {
    for (const [k, v] of Object.entries(EMAIL_ENV)) vi.stubEnv(k, v);
    const timeout = vi.fn().mockRejectedValue(Object.assign(new Error("t"), { name: "TimeoutError" }));
    const provider = new ZohoCpaasEmailProvider(timeout);
    expect((await provider.send({ to: { address: "not-an-email" }, subject: "s", text: "t" })).status).toBe("INVALID_RECIPIENT");
    expect(await provider.send({ to: { address: "a@b.com" }, subject: "s", text: "t" })).toEqual({ status: "FAILED", error: "Email provider timed out.", retryable: true });
  });
  it("treats a 4xx rejection as not retryable and sanitizes the provider message", async () => {
    for (const [k, v] of Object.entries(EMAIL_ENV)) vi.stubEnv(k, v);
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: "TM_4001", message: "Bad address a@b.com <script>" } }), { status: 400 }));
    const r = await new ZohoCpaasEmailProvider(fetchMock).send({ to: { address: "a@b.com" }, subject: "s", text: "t" });
    expect(r).toMatchObject({ status: "FAILED", retryable: false });
    expect(JSON.stringify(r)).not.toMatch(/a@b\.com|<script>/);
  });
  it("escapes template content in the HTML body", () => {
    expect(renderEmailHtml("Hi <b>", "Note: <img src=x>")).not.toContain("<img");
  });
});

describe("Expo push provider", () => {
  it("validates Expo token format", () => {
    expect(isExpoPushToken(TOKEN)).toBe(true);
    expect(isExpoPushToken("ExpoPushToken[abcdefghijklmnop]")).toBe(true);
    for (const bad of ["fcm-raw-token", "ExponentPushToken[]", "ExponentPushToken[a b]", 42, null]) expect(isExpoPushToken(bad)).toBe(false);
  });
  it("sends nothing and touches no storage when not configured", async () => {
    vi.stubEnv("PUSH_NOTIFICATIONS_ENABLED", "");
    const fetchMock = vi.fn();
    expect((await sendPush([{ userId: "u", title: "t", message: "m" }], fetchMock)).status).toBe("NOT_CONFIGURED");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("device registration", () => {
  const configured = () => vi.stubEnv("PUSH_NOTIFICATIONS_ENABLED", "true");

  it("requires sign-in and a valid token", async () => {
    m.requestUser.mockResolvedValue(null);
    expect((await POST(req("POST", { token: TOKEN, app: "com.ridegrid.customer", platform: "android" }))).status).toBe(401);
    m.requestUser.mockResolvedValue({ id: "user-a", role: "CUSTOMER" });
    expect((await POST(req("POST", { token: "raw", app: "com.ridegrid.customer", platform: "android" }))).status).toBe(400);
  });
  it("binds the token to the session user only, ignoring any user id in the body", async () => {
    configured();
    m.requestUser.mockResolvedValue({ id: "user-a", role: "CUSTOMER" });
    const res = await POST(req("POST", { token: TOKEN, app: "com.ridegrid.customer", platform: "android", userId: "user-b" }));
    expect(res.status).toBe(200);
    expect(m.upsert.mock.calls[0][0].create.userId).toBe("user-a");
    expect(m.upsert.mock.calls[0][0].update.userId).toBe("user-a");
  });
  it("refuses an app that does not serve the account's role", async () => {
    configured();
    m.requestUser.mockResolvedValue({ id: "user-a", role: "CUSTOMER" });
    expect((await POST(req("POST", { token: TOKEN, app: "com.ridegrid.driver", platform: "android" }))).status).toBe(403);
    m.requestUser.mockResolvedValue({ id: "emp", role: "CORPORATE_EMPLOYEE" });
    expect((await POST(req("POST", { token: TOKEN, app: "com.ridegrid.corporate", platform: "android" }))).status).toBe(200);
  });
  it("stores nothing while push is not configured", async () => {
    vi.stubEnv("PUSH_NOTIFICATIONS_ENABLED", "");
    m.requestUser.mockResolvedValue({ id: "user-a", role: "CUSTOMER" });
    const body = await (await POST(req("POST", { token: TOKEN, app: "com.ridegrid.customer", platform: "android" }))).json();
    expect(body.data).toEqual({ registered: false, reason: "NOT_CONFIGURED" });
    expect(m.upsert).not.toHaveBeenCalled();
  });
  it("rejects cross-site registration", async () => {
    configured();
    m.requestUser.mockResolvedValue({ id: "user-a", role: "CUSTOMER" });
    expect((await POST(req("POST", { token: TOKEN, app: "com.ridegrid.customer", platform: "android" }, { "sec-fetch-site": "cross-site" }))).status).toBe(403);
  });
  it("removes only the caller's own token", async () => {
    m.requestUser.mockResolvedValue({ id: "user-a", role: "CUSTOMER" });
    expect((await DELETE(req("DELETE", { token: TOKEN }))).status).toBe(200);
    expect(m.updateMany.mock.calls[0][0].where).toEqual({ token: TOKEN, userId: "user-a", isActive: true });
  });
  it("logout deactivates the device token of the refresh token's owner", async () => {
    m.getUserId.mockResolvedValue("user-a");
    const res = await logout(new NextRequest("https://ridegrid.test/api/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken: "r1", pushToken: TOKEN }) }));
    expect(res.status).toBe(200);
    expect(m.updateMany.mock.calls[0][0].where).toEqual({ token: TOKEN, userId: "user-a", isActive: true });
    expect(m.logout).toHaveBeenCalled();
  });
  it("logout still completes if push storage fails", async () => {
    m.getUserId.mockResolvedValue("user-a");
    m.updateMany.mockRejectedValue(new Error("relation PushDevice does not exist"));
    const res = await logout(new NextRequest("https://ridegrid.test/api/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken: "r1", pushToken: TOKEN }) }));
    expect(res.status).toBe(200);
    expect(m.logout).toHaveBeenCalled();
  });
});

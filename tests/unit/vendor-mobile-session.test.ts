// @vitest-environment node
import { beforeEach, describe, it, expect, vi } from "vitest";
const store = vi.hoisted(() => ({ write: vi.fn(), read: vi.fn() }));
vi.mock("../../apps/vendor-mobile/src/storage/session", () => ({
  sessionStore: store,
  validSession: (s: any) =>
    !!s?.accessToken && !!s?.refreshToken && s?.user?.role === "VENDOR",
}));
const session = {
  accessToken: "expired",
  refreshToken: "refresh",
  user: { id: "user", role: "VENDOR" },
  expiresAt: "2030-01-01",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify({ success: status < 400, data }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  process.env.EXPO_PUBLIC_API_BASE_URL = "https://ridegrid.test";
});
describe("mobile authenticated transport", () => {
  it("rotates refresh tokens once for concurrent 401s and retries with the new access token", async () => {
    let refreshes = 0;
    const fetch = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input).endsWith("/auth/refresh")) {
          refreshes++;
          await new Promise((r) => setTimeout(r, 5));
          return json({
            ...session,
            accessToken: "new-access",
            refreshToken: "new-refresh",
          });
        }
        return (init?.headers as Record<string, string>).Authorization ===
          "Bearer new-access"
          ? json({ ok: true })
          : json(null, 401);
      },
    );
    vi.stubGlobal("fetch", fetch);
    const api = await import("../../apps/vendor-mobile/src/services/api");
    await api.setSession(session as any);
    expect(
      await Promise.all([api.api("/private/a"), api.api("/private/b")]),
    ).toEqual([{ ok: true }, { ok: true }]);
    expect(refreshes).toBe(1);
    expect(store.write).toHaveBeenLastCalledWith(
      expect.objectContaining({ refreshToken: "new-refresh" }),
    );
  });
  it("clears an invalid refresh session and never falls back to a guest mutation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json(null, 401)),
    );
    const api = await import("../../apps/vendor-mobile/src/services/api");
    await api.setSession(session as any);
    await expect(api.post("/booking", {})).rejects.toMatchObject({
      status: 401,
    });
    expect(api.currentSession()).toBeNull();
    expect(store.write).toHaveBeenLastCalledWith(null);
  });
  it("preserves credentials on transient refresh service failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) =>
        json(null, String(input).endsWith("/auth/refresh") ? 503 : 401),
      ),
    );
    const api = await import("../../apps/vendor-mobile/src/services/api");
    await api.setSession(session as any);
    await expect(api.api("/private")).rejects.toMatchObject({ status: 503 });
    expect(api.currentSession()?.refreshToken).toBe("refresh");
  });
  it("does not resurrect a session when logout occurs during token refresh", async () => {
    let finish: (r: Response) => void = () => {};
    let started: () => void = () => {};
    const ready = new Promise<void>((r) => {
      started = r;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).endsWith("/auth/refresh")) {
          started();
          return new Promise<Response>((r) => {
            finish = r;
          });
        }
        return json(null, 401);
      }),
    );
    const api = await import("../../apps/vendor-mobile/src/services/api");
    await api.setSession(session as any);
    const pending = api.api("/private");
    await ready;
    await api.setSession(null);
    finish(json({ ...session, accessToken: "new" }));
    await expect(pending).rejects.toMatchObject({ status: 401 });
    expect(api.currentSession()).toBeNull();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const created: { tokenHash: string; userId: string; expiresAt: Date }[] = [];
const send = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: async (ops: unknown[]) => Promise.all(ops),
    passwordResetToken: {
      updateMany: vi.fn(async () => ({ count: 0 })),
      create: vi.fn(async ({ data }: { data: (typeof created)[number] }) => { created.push(data); return data; }),
    },
    notificationLog: { create: vi.fn(async () => ({})) },
  },
}));
vi.mock("@/lib/notifications/email", () => ({ emailProvider: { send: (m: unknown) => send(m) }, logEmailResult: vi.fn(async () => {}) }));

import { accountEmailContent, hashResetToken, resetLink, sendAccountLink } from "@/lib/auth/account-email";

beforeEach(() => { created.length = 0; send.mockReset(); });

describe("account link email", () => {
  it("uses the production origin and never stores the raw token", async () => {
    send.mockResolvedValue({ status: "SENT", providerRequestId: "r1" });
    const out = await sendAccountLink({ id: "u1", email: "a@b.co", name: "Asha" }, "ACTIVATION", "Vendor");
    expect(out.sent).toBe(true);
    const text: string = send.mock.calls[0][0].text;
    const token = new URL(text.match(/https:\/\/\S+/)![0]).searchParams.get("token")!;
    expect(text).toContain("https://www.wellcabs.com/reset-password?token=");
    expect(created[0].tokenHash).toBe(hashResetToken(token));
    expect(created[0].tokenHash).not.toBe(token);
    expect(created[0].expiresAt.getTime() - Date.now()).toBeGreaterThan(71 * 3600_000);
  });

  it("reports delivery failure without throwing", async () => {
    send.mockResolvedValue({ status: "NOT_CONFIGURED", reason: "ZOHO_CPAAS_EMAIL_API_KEY is not set." });
    const out = await sendAccountLink({ id: "u1", email: "a@b.co" }, "RESET", "Customer");
    expect(out).toEqual({ sent: false, reason: "Email is not configured." });
    expect(JSON.stringify(out)).not.toContain("ZOHO_CPAAS");
  });

  it("reset links expire in 30 minutes and mention the role app for activation", () => {
    expect(accountEmailContent("RESET", "Customer", resetLink("t")).text).toContain("30 minutes");
    expect(accountEmailContent("ACTIVATION", "Driver", resetLink("t")).text).toContain("Driver app");
  });
});

// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const m = vi.hoisted(() => ({ lead: { create: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ prisma: m }));
import { POST } from "@/app/api/public/corporate-enquiry/route";

let ip = 0;
const send = (body: unknown, headers: Record<string, string> = {}) => POST(new NextRequest("https://www.wellcabs.com/api/public/corporate-enquiry", {
  method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json", "x-forwarded-for": `10.0.0.${++ip}`, ...headers },
}));
const valid = { companyName: "Acme", contactPerson: "Ria", email: "ria@acme.test", mobile: "9000000000", city: "Pune", employees: "26–100" };

beforeEach(() => { vi.resetAllMocks(); m.lead.create.mockResolvedValue({ id: "cmlead00000abcdefgh" }); });

describe("public corporate enquiry", () => {
  it("records a NEW corporate website lead in the central CRM", async () => {
    const r = await send(valid);
    expect(r.status).toBe(201);
    expect(m.lead.create.mock.calls[0][0].data).toMatchObject({ leadType: "CORPORATE", source: "WEBSITE", status: "NEW", companyName: "Acme", email: "ria@acme.test" });
    expect(m.lead.create.mock.calls[0][0].data).not.toHaveProperty("ownerId");
  });
  it("validates contact details and ignores bot submissions", async () => {
    expect((await send({ ...valid, email: "nope" })).status).toBe(400);
    expect((await send({ ...valid, companyName: "" })).status).toBe(400);
    expect((await send({ ...valid, website: "spam.example" })).status).toBe(200);
    expect(m.lead.create).not.toHaveBeenCalled();
  });
  it("refuses cross-site posts and rate-limits repeated enquiries", async () => {
    expect((await send(valid, { origin: "https://evil.test" })).status).toBe(403);
    const same = { "x-forwarded-for": "10.9.9.9" };
    const statuses = [];
    for (let i = 0; i < 6; i++) statuses.push((await POST(new NextRequest("https://www.wellcabs.com/api/public/corporate-enquiry", { method: "POST", body: JSON.stringify(valid), headers: { "Content-Type": "application/json", ...same } }))).status);
    expect(statuses.slice(0, 5)).toEqual([201, 201, 201, 201, 201]);
    expect(statuses[5]).toBe(429);
  });
});

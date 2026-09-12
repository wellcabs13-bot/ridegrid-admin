// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { SeoInputError } from "../../lib/website-seo/seo/types";
const { generate } = vi.hoisted(() => ({ generate: vi.fn() }));
vi.mock("@/lib/website-seo/seo/engine", () => ({ websiteSeoEngine: { generate } }));
import { POST } from "../../app/api/website-seo/seo/generate/route";
const request = (body: unknown) => new NextRequest("http://localhost/api/website-seo/seo/generate", { method: "POST", body: JSON.stringify(body) });
describe("W6 SEO API", () => {
  beforeEach(() => { generate.mockReset(); });
  it.each([null, [], {}, { entityId: " " }, { entityId: 1 }, { entityId: "e", pageId: "" },
    { entityId: "e", persist: "true" }, { entityId: "e", title: "fake" }, { entityId: "e", baseUrl: "https://fake.test" }])(
    "rejects invalid or fake input %j", async body => {
      expect((await POST(request(body))).status).toBe(400); expect(generate).not.toHaveBeenCalled();
    });
  it.each([undefined, false, true])("passes persistence=%s to the engine", async persist => {
    generate.mockResolvedValue({ metadata: { title: "Real title" } });
    const response = await POST(request({ entityId: " e ", pageId: " p ", persist }));
    expect(response.status).toBe(200);
    expect(generate).toHaveBeenCalledWith({ entityId: "e", pageId: "p", persist: persist === true });
  });
  it.each([404, 409, 422])("returns domain status %s", async status => {
    generate.mockRejectedValue(new SeoInputError("Cannot load page", status));
    expect((await POST(request({ entityId: "e" }))).status).toBe(status);
  });
  it("rejects malformed JSON", async () => {
    expect((await POST(new NextRequest("http://localhost/api/website-seo/seo/generate", { method: "POST", body: "{" }))).status).toBe(400);
  });
  it("hides infrastructure details on failure", async () => {
    generate.mockRejectedValue(new Error("SECRET_DB_CONNECTION"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await POST(request({ entityId: "e" }));
      expect(response.status).toBe(500); expect(await response.text()).not.toContain("SECRET_DB_CONNECTION");
      expect(JSON.stringify(log.mock.calls)).not.toContain("SECRET_DB_CONNECTION");
    } finally { log.mockRestore(); }
  });
});

// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ContentInputError } from "../../lib/website-seo/content/types";
const { generate } = vi.hoisted(() => ({ generate: vi.fn() }));
vi.mock("@/lib/website-seo/content/engine", () => ({ websiteContentEngine: { generate } }));
import { POST } from "../../app/api/website-seo/content/generate/route";
const request = (body: unknown) => new NextRequest("http://localhost/api/website-seo/content/generate", {
  method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" },
});
describe("W5 content API", () => {
  beforeEach(() => { generate.mockReset(); });
  it.each([null, [], {}, { entityId: " " }, { entityId: 2 }, { entityId: "e", persist: "true" },
    { entityId: "e", pageId: "" }, { entityId: "e", name: "fake" }, { entityId: "e", provider: "unknown" }])(
    "rejects invalid input: %j", async body => {
      expect((await POST(request(body))).status).toBe(400); expect(generate).not.toHaveBeenCalled();
    });
  it.each([undefined, false, true])("delegates persist=%s", async persist => {
    generate.mockResolvedValue({ sections: [], persistence: { status: "PREVIEW" } });
    expect((await POST(request({ entityId: " e ", pageId: " p ", persist }))).status).toBe(200);
    expect(generate).toHaveBeenCalledWith({ entityId: "e", pageId: "p", persist: persist === true });
  });
  it.each([404, 409, 422])("returns domain error %s", async status => {
    generate.mockRejectedValue(new ContentInputError("Unavailable", status));
    expect((await POST(request({ entityId: "e" }))).status).toBe(status);
  });
  it("rejects malformed JSON", async () => {
    expect((await POST(new NextRequest("http://localhost/api/website-seo/content/generate", { method: "POST", body: "{" }))).status).toBe(400);
  });
  it("does not disclose provider secrets in errors", async () => {
    generate.mockRejectedValue(new Error("SECRET_PROVIDER_KEY"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await POST(request({ entityId: "e" }));
      expect(response.status).toBe(500); expect(await response.text()).not.toContain("SECRET_PROVIDER_KEY");
      expect(JSON.stringify(log.mock.calls)).not.toContain("SECRET_PROVIDER_KEY");
    } finally { log.mockRestore(); }
  });
});

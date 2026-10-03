// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { generate } = vi.hoisted(() => ({ generate: vi.fn() }));
vi.mock("@/lib/website-seo/keywords/engine", () => ({
  keywordIntelligenceEngine: { generate },
  KeywordEntityNotFoundError: class KeywordEntityNotFoundError extends Error {},
}));
import { POST } from "../../app/api/website-seo/keywords/generate/route";
import { KeywordEntityNotFoundError } from "../../lib/website-seo/keywords/engine";

const request = (body: unknown) => new NextRequest("http://localhost/api/website-seo/keywords/generate", {
  method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" },
});

describe("W4.5 generate endpoint", () => {
  beforeEach(() => { generate.mockReset(); });
  it.each([null, [], {}, { entityId: " " }, { entityId: 1 },
    { entityId: "real-id", persist: "true" }, { entityId: "real-id", metadata: { name: "fake" } },
  ])("rejects invalid or arbitrary entity data: %j", async body => {
    expect((await POST(request(body))).status).toBe(400);
    expect(generate).not.toHaveBeenCalled();
  });
  it("rejects malformed JSON", async () => {
    const response = await POST(new NextRequest("http://localhost/api/website-seo/keywords/generate", {
      method: "POST", body: "{",
    }));
    expect(response.status).toBe(400);
    expect(generate).not.toHaveBeenCalled();
  });
  it.each([undefined, false, true])("passes persist=%s to the central engine", async persist => {
    generate.mockResolvedValue({ candidateCount: 3 });
    const response = await POST(request({ entityId: " real-id ", persist }));
    expect(generate).toHaveBeenCalledWith("real-id", persist === true);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { candidateCount: 3 } });
  });
  it("reports missing entities", async () => {
    generate.mockRejectedValue(new KeywordEntityNotFoundError("Website entity not found."));
    expect((await POST(request({ entityId: "missing" }))).status).toBe(404);
  });
});

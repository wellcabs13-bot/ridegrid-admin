// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { authorize } from "../../lib/authorize";
import { GET, POST } from "../../app/api/website-seo/media/ai-images/route";
import { assignImage, queueImages } from "../../lib/website-seo/media/ai-image/service";

vi.mock("../../lib/authorize", () => ({ authorize: vi.fn() }));
vi.mock("../../lib/website-seo/media/ai-image/service", () => ({ assignImage: vi.fn(), queueImages: vi.fn(), imageTarget: vi.fn(), reviewImageJob: vi.fn(), saveImageSettings: vi.fn(), restoreImageJob: vi.fn() }));
const req = (body: unknown, headers: Record<string, string> = {}) => new NextRequest("https://ridegrid.test/api/website-seo/media/ai-images", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
beforeEach(() => { vi.clearAllMocks(); vi.mocked(authorize).mockReturnValue({ id: "admin", role: "SUPER_ADMIN" } as never); vi.mocked(queueImages).mockResolvedValue([]); });
describe("W19 image API security", () => {
  it("requires administrator access before any read or generation", async () => {
    vi.mocked(authorize).mockReturnValue(null);
    expect((await POST(req({ action: "queue", pageIds: ["homepage"], slots: ["heroImage"] }))).status).toBe(403);
    expect((await GET(req({}))).status).toBe(403); expect(queueImages).not.toHaveBeenCalled();
  });
  it("rejects cross-site writes", async () => { expect((await POST(req({ action: "queue" }, { origin: "https://evil.test" }))).status).toBe(403); expect(queueImages).not.toHaveBeenCalled(); });
  it("caps streaming input before parsing", async () => { expect((await POST(req({ prompt: "a".repeat(64000) }))).status).toBe(413); });
  it.each([{ action: "queue", pageIds: "homepage", slots: [] }, { action: "queue", pageIds: ["homepage"], slots: ["invalid"] }, { action: "queue", pageIds: ["homepage"], slots: ["heroImage"], autoAssign: "yes" }, { action: "unknown" }])("rejects invalid payloads", async body => { expect((await POST(req(body))).status).toBe(400); expect(queueImages).not.toHaveBeenCalled(); });
  it("queues validated requests with authenticated actor", async () => {
    expect((await POST(req({ action: "queue", pageIds: ["homepage"], slots: ["heroImage"], autoAssign: false }))).status).toBe(200);
    expect(queueImages).toHaveBeenCalledWith(["homepage"], ["heroImage"], "admin", expect.objectContaining({ autoAssign: false }));
  });
  it("supports assignment removal explicitly", async () => {
    expect((await POST(req({ action: "assign", pageId: "homepage", slot: "heroImage", assetId: null }))).status).toBe(200);
    expect(assignImage).toHaveBeenCalledWith("homepage", "heroImage", null, "admin", undefined);
  });
});

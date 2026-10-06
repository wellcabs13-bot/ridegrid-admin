// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs/promises";

const env = { ...process.env };
async function load() {
  vi.resetModules();
  return import("@/lib/services/storage/FileStorageService");
}

describe("FileStorageService (private Supabase bucket)", () => {
  beforeEach(() => { vi.restoreAllMocks(); });
  afterEach(() => { process.env = { ...env }; vi.unstubAllGlobals(); });

  it("never writes to the deployment filesystem in production without storage credentials", async () => {
    process.env = { ...env, NODE_ENV: "production", SUPABASE_SERVICE_ROLE_KEY: "", SUPABASE_URL: "" };
    const mkdir = vi.spyOn(fs, "mkdir");
    const { storeFile, StorageUnavailableError } = await load();
    await expect(storeFile({ name: "a.pdf", mimeType: "application/pdf", content: Buffer.from("x") })).rejects.toBeInstanceOf(StorageUnavailableError);
    expect(mkdir).not.toHaveBeenCalled();
  });

  it("uploads to the private ridegrid-documents bucket with a sanitized key and server-side key", async () => {
    process.env = { ...env, NODE_ENV: "production", SUPABASE_URL: "https://proj.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "service-key" };
    const calls: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => { calls.push({ url, init }); return new Response("{}", { status: 200 }); }));
    const { storeFile } = await load();
    const stored = await storeFile({ name: "../../Aadhaar card (1).pdf", mimeType: "application/pdf", content: Buffer.from("pdf") });
    expect(stored.fileUrl).toBe(`/api/files/${stored.id}`);
    expect(stored.storageKey).toBe(`media/${stored.id}/Aadhaar_card__1_.pdf`);
    const upload = calls.find(c => c.url.includes("/storage/v1/object/ridegrid-documents/"))!;
    expect(upload.url).toBe(`https://proj.supabase.co/storage/v1/object/ridegrid-documents/${stored.storageKey}`);
    expect((upload.init.headers as Record<string, string>).Authorization).toBe("Bearer service-key");
  });

  it("derives the project URL from the Supabase pooler user and signs short-lived URLs", async () => {
    process.env = { ...env, NODE_ENV: "production", SUPABASE_URL: "", SUPABASE_SERVICE_ROLE_KEY: "k", DATABASE_URL: "postgresql://postgres.abcdefghijklmnop:pw@aws-1-ap-south-1.pooler.supabase.com:5432/postgres" };
    let body = "";
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => { body = String(init.body); return new Response(JSON.stringify({ signedURL: "/object/sign/ridegrid-documents/media/x/a.pdf?token=t" }), { status: 200 }); }));
    const { signedFileUrl } = await load();
    const url = await signedFileUrl("media/x/a.pdf");
    expect(url).toBe("https://abcdefghijklmnop.supabase.co/storage/v1/object/sign/ridegrid-documents/media/x/a.pdf?token=t");
    expect(JSON.parse(body).expiresIn).toBe(60);
  });
});

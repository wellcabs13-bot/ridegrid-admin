import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

// Uploaded files live in ONE private Supabase Storage bucket. Files are referenced
// everywhere as /api/files/{id}; that route authorizes the caller and then redirects
// to a short-lived signed URL. The service-role key is server-only.
// Local development without Supabase credentials falls back to ./storage/media;
// production never writes to the (read-only) deployment filesystem.

export const STORAGE_BUCKET = "ridegrid-documents";
export const SIGNED_URL_SECONDS = 60;
const LOCAL_ROOT = () => path.join(process.cwd(), "storage", "media");

export type StoredFile = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  checksum: string;
  storageKey: string;
  fileUrl: string;
  createdAt: Date;
};

export class StorageUnavailableError extends Error {
  status = 503;
  constructor(message: string) { super(message); this.name = "StorageUnavailableError"; }
}

const safeFileName = (name: string) => path.basename(name).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";
const validId = (id: string) => /^[a-zA-Z0-9-]{1,100}$/.test(id);

// SUPABASE_URL, or derived from the Supabase pooler user "postgres.<project-ref>".
function supabaseUrl(): string | null {
  const explicit = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  if (explicit) return explicit;
  try {
    const ref = new URL(process.env.DATABASE_URL || "").username.match(/^postgres\.([a-z0-9]{10,40})$/)?.[1];
    return ref ? `https://${ref}.supabase.co` : null;
  } catch { return null; }
}

function remote() {
  const url = supabaseUrl(), key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return url && key ? { url, key } : null;
}

function requireRemote() {
  const r = remote();
  if (r) return r;
  if (process.env.NODE_ENV === "production")
    throw new StorageUnavailableError("Document storage is not configured. Set SUPABASE_SERVICE_ROLE_KEY (and SUPABASE_URL).");
  return null;
}

async function sb(r: { url: string; key: string }, method: string, route: string, body?: BodyInit | object, contentType?: string) {
  const isJson = body !== undefined && !(body instanceof Uint8Array) && typeof body === "object";
  return fetch(`${r.url}/storage/v1/${route}`, {
    method,
    headers: { Authorization: `Bearer ${r.key}`, apikey: r.key, ...(contentType || isJson ? { "Content-Type": contentType || "application/json" } : {}) },
    body: body === undefined ? undefined : isJson ? JSON.stringify(body) : (body as BodyInit),
    cache: "no-store",
  });
}

let bucketReady: Promise<void> | null = null;
function ensureBucket(r: { url: string; key: string }) {
  bucketReady ??= (async () => {
    const got = await sb(r, "GET", `bucket/${STORAGE_BUCKET}`);
    if (got.ok) return;
    const made = await sb(r, "POST", "bucket", { id: STORAGE_BUCKET, name: STORAGE_BUCKET, public: false });
    if (!made.ok && made.status !== 409) throw new StorageUnavailableError(`Document storage bucket unavailable (${made.status}).`);
  })().catch(e => { bucketReady = null; throw e; });
  return bucketReady;
}

export async function storeFile(input: { name: string; mimeType: string; content: Buffer }): Promise<StoredFile> {
  if (!input.name.trim()) throw new Error("File name is required.");
  const id = crypto.randomUUID();
  const safeName = safeFileName(input.name);
  const storageKey = `media/${id}/${safeName}`;
  const r = requireRemote();
  if (r) {
    await ensureBucket(r);
    const res = await sb(r, "POST", `object/${STORAGE_BUCKET}/${storageKey}`, new Uint8Array(input.content), input.mimeType || "application/octet-stream");
    if (!res.ok) throw new StorageUnavailableError(`File upload to storage failed (${res.status}).`);
  } else {
    const dir = path.join(LOCAL_ROOT(), id);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, safeName), input.content);
  }
  return {
    id, name: input.name, mimeType: input.mimeType, size: input.content.length,
    checksum: crypto.createHash("sha256").update(input.content).digest("hex"),
    storageKey, fileUrl: `/api/files/${id}`, createdAt: new Date(),
  };
}

// Finds the stored object for an /api/files/{id} reference. Objects uploaded before the
// move to Supabase may still exist in the deployed ./storage/media (read-only).
export async function locateStoredFile(id: string): Promise<{ name: string; remoteKey?: string; localPath?: string } | null> {
  if (!validId(id)) return null;
  const r = remote();
  if (r) {
    const res = await sb(r, "POST", `object/list/${STORAGE_BUCKET}`, { prefix: `media/${id}/`, limit: 5 });
    if (res.ok) {
      const items = (await res.json()) as { name: string; id: string | null }[];
      const file = items.find(i => i.id);
      if (file) return { name: file.name, remoteKey: `media/${id}/${file.name}` };
    }
  }
  const dir = path.join(LOCAL_ROOT(), id);
  const files = await fs.readdir(dir).catch(() => [] as string[]);
  return files.length ? { name: files[0], localPath: path.join(dir, files[0]) } : null;
}

export async function signedFileUrl(remoteKey: string, seconds = SIGNED_URL_SECONDS): Promise<string> {
  const r = requireRemote();
  if (!r) throw new StorageUnavailableError("Document storage is not configured.");
  const res = await sb(r, "POST", `object/sign/${STORAGE_BUCKET}/${remoteKey}`, { expiresIn: seconds });
  const j = res.ok ? ((await res.json()) as { signedURL?: string }) : null;
  if (!j?.signedURL) throw new StorageUnavailableError("Could not create a download link.");
  return `${r.url}/storage/v1${j.signedURL.startsWith("/") ? "" : "/"}${j.signedURL}`;
}

// Reads the bytes server-side (for routes that stream a document after their own checks).
export async function readStoredFile(id: string): Promise<{ body: Buffer; name: string } | null> {
  const found = await locateStoredFile(id);
  if (!found) return null;
  if (found.localPath) return { body: await fs.readFile(found.localPath), name: found.name };
  const r = requireRemote()!;
  const res = await sb(r, "GET", `object/authenticated/${STORAGE_BUCKET}/${found.remoteKey}`);
  if (!res.ok) return null;
  return { body: Buffer.from(await res.arrayBuffer()), name: found.name };
}

// Metadata-only companion for callers that already own persistence.
export function createStorageRecord(input: {
  name: string; mimeType: string; size: number; content: string | Buffer;
}): StoredFile {
  if (!input.name.trim()) throw new Error("File name is required.");
  const id = crypto.randomUUID();
  return {
    id, name: input.name, mimeType: input.mimeType, size: input.size,
    checksum: crypto.createHash("sha256").update(input.content).digest("hex"),
    storageKey: `media/${id}/${safeFileName(input.name)}`,
    fileUrl: `/api/files/${id}`, createdAt: new Date(),
  };
}

export function validateFileType(
  mimeType: string,
  allowedTypes: string[]
): boolean {
  return allowedTypes.includes(mimeType);
}

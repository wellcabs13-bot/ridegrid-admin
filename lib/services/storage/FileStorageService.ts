import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

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

export async function storeFile(input: {
  name: string;
  mimeType: string;
  content: Buffer;
}): Promise<StoredFile> {
  if (!input.name.trim()) throw new Error("File name is required.");

  const id = crypto.randomUUID();
  const safeName = path.basename(input.name).replace(/[^a-zA-Z0-9._-]/g, "_");
  const storageKey = `media/${id}/${safeName}`;

  const storageRoot = path.join(process.cwd(), "storage");
  const absoluteDir = path.join(storageRoot, "media", id);
  const absolutePath = path.join(absoluteDir, safeName);

  await fs.mkdir(absoluteDir, { recursive: true });
  await fs.writeFile(absolutePath, input.content);

  const checksum = crypto
    .createHash("sha256")
    .update(input.content)
    .digest("hex");

  return {
    id,
    name: input.name,
    mimeType: input.mimeType,
    size: input.content.length,
    checksum,
    storageKey,
    fileUrl: `/api/files/${id}`,
    createdAt: new Date(),
  };
}

export function validateFileType(
  mimeType: string,
  allowedTypes: string[]
): boolean {
  return allowedTypes.includes(mimeType);
}

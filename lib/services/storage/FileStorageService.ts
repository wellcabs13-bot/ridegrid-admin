import crypto from "crypto";

export type StoredFile = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  checksum: string;
  storageKey: string;
  createdAt: Date;
};

export function createStorageRecord(input: {
  name: string;
  mimeType: string;
  size: number;
  content: string;
}): StoredFile {
  if (!input.name.trim()) throw new Error("File name is required.");
  if (input.size < 0) throw new Error("File size cannot be negative.");

  const checksum = crypto
    .createHash("sha256")
    .update(input.content)
    .digest("hex");

  return {
    id: crypto.randomUUID(),
    name: input.name,
    mimeType: input.mimeType,
    size: input.size,
    checksum,
    storageKey: `media/${crypto.randomUUID()}/${input.name}`,
    createdAt: new Date(),
  };
}

export function validateFileType(
  mimeType: string,
  allowedTypes: string[]
): boolean {
  return allowedTypes.includes(mimeType);
}
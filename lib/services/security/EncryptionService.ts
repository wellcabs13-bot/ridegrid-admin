import crypto from "crypto";

const algorithm = "aes-256-gcm";

function key(): Buffer {
  const raw = process.env.RIDEGRID_ENCRYPTION_KEY;
  if (!raw) throw new Error("RIDEGRID_ENCRYPTION_KEY is required.");
  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptValue(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, key(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), tag.toString("hex"), encrypted.toString("hex")].join(".");
}

export function decryptValue(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(".");
  if (!ivHex || !tagHex || !dataHex) throw new Error("Invalid encrypted value.");
  const decipher = crypto.createDecipheriv(algorithm, key(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}
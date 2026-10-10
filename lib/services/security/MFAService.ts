import crypto from "crypto";

export function generateMFASecret(): string {
  return crypto.randomBytes(20).toString("hex");
}

export function generateOTP(): string {
  return String(crypto.randomInt(100000, 1000000));
}

export function hashSecurityToken(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function verifySecurityToken(value: string, hash: string): boolean {
  return hashSecurityToken(value) === hash;
}
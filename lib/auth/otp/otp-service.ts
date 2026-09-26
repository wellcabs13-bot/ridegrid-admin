import crypto from "crypto";

const TTL_MS = 5 * 60 * 1000;
const RESEND_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

type OTPRecord = {
  hash: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
};

const store = new Map<string, OTPRecord>();

function key(identifier: string) {
  return identifier.trim().toLowerCase();
}

function hash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function requestOTP(identifier: string) {
  const k = key(identifier);
  const now = Date.now();
  const existing = store.get(k);

  if (existing && now - existing.lastSentAt < RESEND_MS) {
    throw new Error("OTP_RESEND_COOLDOWN");
  }

  const otp = crypto.randomInt(100000, 1000000).toString();

  store.set(k, {
    hash: hash(otp),
    expiresAt: now + TTL_MS,
    attempts: 0,
    lastSentAt: now,
  });

  return { otp, expiresAt: now + TTL_MS };
}

export function verifyOTP(identifier: string, otp: string) {
  const k = key(identifier);
  const record = store.get(k);

  if (!record) throw new Error("OTP_NOT_FOUND");
  if (Date.now() > record.expiresAt) {
    store.delete(k);
    throw new Error("OTP_EXPIRED");
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    store.delete(k);
    throw new Error("OTP_ATTEMPTS_EXCEEDED");
  }

  record.attempts += 1;

  if (hash(otp) !== record.hash) {
    throw new Error("OTP_INVALID");
  }

  store.delete(k);
  return true;
}
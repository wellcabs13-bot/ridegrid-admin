import "server-only";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { emailProvider, logEmailResult, type EmailResult } from "@/lib/notifications/email";

// One place that issues a password reset / account activation link and emails it
// through the existing Zoho provider. The raw token exists only in the emailed link:
// only its SHA-256 hash is stored, it is single use and it expires. Neither the
// token nor the link is ever logged.

export const RESET_MINUTES = 30;
export const ACTIVATION_MINUTES = 72 * 60;
const PRODUCTION_ORIGIN = "https://www.wellcabs.com";

export type AccountLinkKind = "RESET" | "ACTIVATION";
export type RoleLabel = "Vendor" | "Driver" | "Corporate Employee" | "Corporate Admin" | "Customer" | "RideGrid";

export const hashResetToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export function siteOrigin(): string {
  const raw = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || PRODUCTION_ORIGIN).trim().replace(/\/+$/, "");
  try { return new URL(raw).origin; } catch { return PRODUCTION_ORIGIN; }
}

export function resetLink(token: string) {
  return `${siteOrigin()}/reset-password?token=${encodeURIComponent(token)}`;
}

// Supersedes any earlier unused link for the user, then stores a fresh one.
export async function issueResetToken(userId: string, minutes: number): Promise<string> {
  const raw = crypto.randomBytes(48).toString("base64url");
  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } }),
    prisma.passwordResetToken.create({ data: { tokenHash: hashResetToken(raw), userId, expiresAt: new Date(Date.now() + minutes * 60_000) } }),
  ]);
  return raw;
}

const APP_HINT: Record<RoleLabel, string> = {
  Vendor: "Then sign in to the RideGrid Vendor app with this email address.",
  Driver: "Then sign in to the RideGrid Driver app with this email address.",
  "Corporate Employee": "Then sign in to the RideGrid Corporate app with this work email address.",
  "Corporate Admin": "Then sign in to the RideGrid Corporate portal with this email address.",
  Customer: "Then sign in to RideGrid with this email address.",
  RideGrid: "Then sign in to RideGrid with this email address.",
};

export function accountEmailContent(kind: AccountLinkKind, role: RoleLabel, link: string, name?: string | null) {
  const hello = name?.trim() ? `Hello ${name.trim().slice(0, 60)},` : "Hello,";
  if (kind === "ACTIVATION") {
    return {
      subject: "Activate your RideGrid account",
      text: `${hello}\n\nA RideGrid ${role} account has been created for you. Choose your password to activate it:\n\n${link}\n\nThis link can be used once and expires in 72 hours. ${APP_HINT[role]}\n\nIf you were not expecting this, ignore this email or contact service@wellcabs.com.`,
    };
  }
  return {
    subject: "Reset your RideGrid password",
    text: `${hello}\n\nWe received a request to reset your RideGrid password. Choose a new password here:\n\n${link}\n\nThis link can be used once and expires in ${RESET_MINUTES} minutes. If you did not ask for this, you can ignore this email; your password will not change.`,
  };
}

export type AccountLinkOutcome = { sent: boolean; reason?: string };

// Issues a link and emails it. Never throws; the caller reports `sent` honestly.
export async function sendAccountLink(user: { id: string; email: string; name?: string | null }, kind: AccountLinkKind, role: RoleLabel): Promise<AccountLinkOutcome> {
  let result: EmailResult;
  const content = (link: string) => accountEmailContent(kind, role, link, user.name);
  try {
    const token = await issueResetToken(user.id, kind === "ACTIVATION" ? ACTIVATION_MINUTES : RESET_MINUTES);
    const { subject, text } = content(resetLink(token));
    result = await emailProvider.send({ to: { address: user.email, name: user.name ?? undefined }, subject, text, reference: `acct-${kind.toLowerCase()}-${user.id}`.slice(0, 100) });
    await logEmailResult(user.email, subject, result);
  } catch {
    return { sent: false, reason: "Could not prepare the email." };
  }
  if (result.status === "SENT") return { sent: true };
  const reason = result.status === "NOT_CONFIGURED" ? "Email is not configured." : result.status === "INVALID_RECIPIENT" ? "The email address is not valid." : "The email provider could not deliver the message.";
  return { sent: false, reason };
}

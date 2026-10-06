import { Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Login identity rules (see migration 20261001000000_role_scoped_identity):
// - a user signs in with email OR mobile number + password;
// - the same email/mobile may exist in different roles (CUSTOMER and VENDOR, ...);
// - within one role it is unique among non-deleted users;
// - deleted users release their email/mobile for reuse.

type Db = Prisma.TransactionClient | typeof prisma;

export const normalizeEmail = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

// Indian numbers are stored as 10 digits: "+91 98765 43210", "919876543210",
// "09876543210" and "9876543210" all become "9876543210". Other numbers keep
// their digits (with a leading "+" when one was given).
export function normalizeMobile(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) return digits;
  return raw.startsWith("+") ? `+${digits}` : digits;
}

// Stored spellings an Indian number may have from before normalisation.
export function mobileVariants(value: unknown): string[] {
  const m = normalizeMobile(value);
  if (!m) return [];
  if (!/^\d{10}$/.test(m)) return [m];
  return [m, `+91${m}`, `91${m}`, `+91 ${m}`, `0${m}`, `+91 ${m.slice(0, 5)} ${m.slice(5)}`];
}

export const isEmailIdentifier = (identifier: string) => identifier.includes("@");

export function identifierWhere(identifier: string): Prisma.UserWhereInput {
  return isEmailIdentifier(identifier)
    ? { email: { equals: normalizeEmail(identifier), mode: "insensitive" } }
    : { mobile: { in: mobileVariants(identifier) } };
}

const LOGIN_ROLES = new Set<string>(Object.values(UserRole));
export function parseRole(value: unknown): UserRole | undefined {
  return typeof value === "string" && LOGIN_ROLES.has(value) ? (value as UserRole) : undefined;
}

// Returns which identifier is already used by another active user of the same role.
export async function findIdentityClash(
  input: { role: UserRole; email?: string | null; mobile?: string | null; exceptUserId?: string | null },
  db: Db = prisma,
): Promise<"email" | "mobile" | null> {
  const email = input.email ? normalizeEmail(input.email) : "";
  const mobiles = input.mobile ? mobileVariants(input.mobile) : [];
  const or: Prisma.UserWhereInput[] = [];
  if (email) or.push({ email: { equals: email, mode: "insensitive" } });
  if (mobiles.length) or.push({ mobile: { in: mobiles } });
  if (!or.length) return null;
  const clash = await db.user.findFirst({
    where: { role: input.role, deletedAt: null, OR: or, ...(input.exceptUserId ? { id: { not: input.exceptUserId } } : {}) },
    select: { email: true },
  });
  if (!clash) return null;
  return email && clash.email.toLowerCase() === email ? "email" : "mobile";
}

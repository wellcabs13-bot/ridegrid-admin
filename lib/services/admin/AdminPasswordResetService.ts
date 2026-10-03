import { AuditAction, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { passwordService } from "@/lib/auth/password";
import { AccountLifecycleError, audit } from "./AccountLifecycleService";

// Super Admin "Reset Login Password" for vendor and driver accounts.
// A fresh random temporary password replaces the current hash, the user must choose a
// new password at next login (the existing mustChangePassword flow), refresh sessions
// and outstanding reset links are revoked, and the action is audited. The plaintext is
// returned to the caller exactly once and is never stored or logged.

export type PasswordResetKind = "VENDOR" | "DRIVER";

const TARGET: Record<PasswordResetKind, { role: UserRole; entityName: string; label: string }> = {
  VENDOR: { role: UserRole.VENDOR, entityName: "Vendor", label: "Vendor" },
  DRIVER: { role: UserRole.DRIVER, entityName: "Driver", label: "Driver" },
};

export async function resetLoginPassword(kind: PasswordResetKind, id: string, actorId: string) {
  const target = TARGET[kind];
  const where = { id, deletedAt: null };
  const select = { id: true, user: { select: { id: true, role: true, email: true, mobile: true, isActive: true, deletedAt: true } } };
  const account = kind === "VENDOR"
    ? await prisma.vendor.findFirst({ where, select })
    : await prisma.driver.findFirst({ where, select });
  if (!account) throw new AccountLifecycleError(404, `${target.label} not found.`);
  const user = account.user;
  // Only the account's own role-scoped login is ever reset.
  if (!user || user.deletedAt || user.role !== target.role) throw new AccountLifecycleError(409, `This ${target.label.toLowerCase()} has no login account to reset.`);
  const login = user.email || user.mobile;
  if (!login) throw new AccountLifecycleError(409, `This ${target.label.toLowerCase()} has no email or mobile to sign in with.`);

  const temporaryPassword = passwordService.generateTemporaryPassword(12);
  const hash = await passwordService.hash(temporaryPassword);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { password: hash, mustChangePassword: true } });
    await tx.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: now } });
    await tx.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: now } });
    await audit(tx, { actorId, action: AuditAction.UPDATE, entityName: target.entityName, entityId: account.id, newValue: { event: "LOGIN_PASSWORD_RESET", userId: user.id, mustChangePassword: true, sessionsRevoked: true } });
  });

  return { login, temporaryPassword, loginActive: user.isActive };
}

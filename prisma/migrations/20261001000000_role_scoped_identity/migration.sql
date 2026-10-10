-- Role-scoped login identity: the same email/mobile may belong to different roles
-- (e.g. CUSTOMER and VENDOR), but only once per role among non-deleted users.
-- Deleted users (deletedAt set) release their email/mobile for reuse.

ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

DROP INDEX IF EXISTS "User_email_key";
DROP INDEX IF EXISTS "User_mobile_key";

CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_mobile_idx" ON "User"("mobile");

CREATE UNIQUE INDEX "User_role_email_active_key" ON "User"("role", lower("email")) WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "User_role_mobile_active_key" ON "User"("role", "mobile") WHERE "deletedAt" IS NULL AND "mobile" IS NOT NULL;

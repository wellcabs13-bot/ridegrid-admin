-- Additive only. Records when a vendor was verified and when/why it was suspended.
-- Verification continues to use "isApproved" as the marketplace gate; "verifiedAt"
-- dates it. Suspension also deactivates the vendor login (User.isActive = false).
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3);
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "suspensionReason" TEXT;

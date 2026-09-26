-- Additive only: stores the requested ride an approver decides on, so approval precedes booking.
ALTER TABLE "CorporateApprovalRequest" ADD COLUMN IF NOT EXISTS "requestSnapshot" JSONB;

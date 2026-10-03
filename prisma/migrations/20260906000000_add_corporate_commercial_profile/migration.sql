-- Corporate commercial onboarding profile
-- Stores prospective volume, service preferences and reference documents.
CREATE TABLE IF NOT EXISTS "CorporateCommercialProfile" (
  "id" TEXT NOT NULL,
  "corporateId" TEXT NOT NULL,
  "expectedMonthlyBookings" INTEGER,
  "customerTier" TEXT NOT NULL DEFAULT 'PROSPECT',
  "serviceTypes" JSONB,
  "quotationFileUrl" TEXT,
  "quotationFileName" TEXT,
  "agreementFileUrl" TEXT,
  "agreementFileName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CorporateCommercialProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CorporateCommercialProfile_corporateId_key" UNIQUE ("corporateId"),
  CONSTRAINT "CorporateCommercialProfile_corporateId_fkey"
    FOREIGN KEY ("corporateId") REFERENCES "Corporate"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "CorporateCommercialProfile_corporateId_idx"
  ON "CorporateCommercialProfile" ("corporateId");

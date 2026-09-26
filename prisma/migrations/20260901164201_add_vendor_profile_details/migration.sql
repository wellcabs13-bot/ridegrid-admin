-- Add persistent Vendor profile and banking details.
ALTER TABLE "Vendor"
  ADD COLUMN "homeCity" TEXT,
  ADD COLUMN "fleetSize" INTEGER,
  ADD COLUMN "address" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "state" TEXT,
  ADD COLUMN "pinCode" TEXT,
  ADD COLUMN "bankName" TEXT,
  ADD COLUMN "accountNumber" TEXT,
  ADD COLUMN "ifscCode" TEXT,
  ADD COLUMN "branchName" TEXT;

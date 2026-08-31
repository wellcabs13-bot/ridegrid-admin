-- Reconstructed from the production database state.
-- Migration was already applied to production on 2026-08-15.

-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM (
  'ACTIVE',
  'INACTIVE',
  'SUSPENDED',
  'PENDING'
);

-- AlterTable
ALTER TABLE "Driver"
ADD COLUMN "status" "DriverStatus" NOT NULL DEFAULT 'ACTIVE';

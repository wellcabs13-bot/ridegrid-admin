-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('WEBSITE', 'APP', 'CORPORATE');

-- AlterTable
ALTER TABLE "Booking"
ADD COLUMN "bookingSource" "BookingSource" NOT NULL DEFAULT 'WEBSITE';

-- Remove the old UUID default so application code owns booking number generation.
ALTER TABLE "Booking"
ALTER COLUMN "bookingNumber" DROP DEFAULT;

-- CreateTable
CREATE TABLE "BookingSequence" (
    "id" TEXT NOT NULL,
    "nextValue" INTEGER NOT NULL DEFAULT 1001,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingSequence_pkey" PRIMARY KEY ("id")
);

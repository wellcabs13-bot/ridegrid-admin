ALTER TABLE "Booking"
ADD COLUMN "corporateId" TEXT;

CREATE INDEX "Booking_corporateId_idx"
ON "Booking"("corporateId");

ALTER TABLE "Booking"
ADD CONSTRAINT "Booking_corporateId_fkey"
FOREIGN KEY ("corporateId") REFERENCES "Corporate"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Additive only: records who a Corporate Portal booking was made for (employee or guest).
CREATE TABLE "CorporateBookingTraveller" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "corporateId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "employeeId" TEXT,
  "guestName" TEXT,
  "guestMobile" TEXT,
  "guestEmail" TEXT,
  "guestReference" TEXT,
  "bookedByUserId" TEXT NOT NULL,
  "bookedByName" TEXT NOT NULL,
  "approvalBasis" TEXT NOT NULL,
  "notifications" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CorporateBookingTraveller_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CorporateBookingTraveller_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CorporateBookingTraveller_bookingId_key" ON "CorporateBookingTraveller"("bookingId");
CREATE INDEX "CorporateBookingTraveller_corporateId_kind_idx" ON "CorporateBookingTraveller"("corporateId", "kind");
CREATE INDEX "CorporateBookingTraveller_employeeId_idx" ON "CorporateBookingTraveller"("employeeId");

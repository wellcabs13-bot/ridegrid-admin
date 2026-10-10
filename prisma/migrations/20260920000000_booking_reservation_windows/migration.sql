ALTER TABLE "Booking"
ADD COLUMN "reservedFrom" TIMESTAMP(3),
ADD COLUMN "reservedUntil" TIMESTAMP(3),
ADD COLUMN "tripDays" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX "Booking_vehicleId_reservedFrom_reservedUntil_idx"
ON "Booking"("vehicleId", "reservedFrom", "reservedUntil");

CREATE INDEX "Booking_driverId_reservedFrom_reservedUntil_idx"
ON "Booking"("driverId", "reservedFrom", "reservedUntil");

CREATE INDEX "Booking_status_reservedFrom_reservedUntil_idx"
ON "Booking"("status", "reservedFrom", "reservedUntil");
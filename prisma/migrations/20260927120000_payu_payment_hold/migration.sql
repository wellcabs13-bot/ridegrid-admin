-- Additive only. Backs the PayU online-payment hold: a Booking sits in
-- AWAITING_PAYMENT (non-operational, still blocks the vehicle/driver window)
-- until the payment is verified, with a finite expiry so an abandoned
-- checkout eventually releases the hold.
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'AWAITING_PAYMENT';

ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "holdExpiresAt" TIMESTAMP(3);

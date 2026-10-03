ALTER TABLE "Booking"
ADD COLUMN "pricingPackageId" TEXT;

CREATE INDEX "Booking_pricingPackageId_idx"
ON "Booking"("pricingPackageId");

ALTER TABLE "Booking"
ADD CONSTRAINT "Booking_pricingPackageId_fkey"
FOREIGN KEY ("pricingPackageId") REFERENCES "PricingPackage"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "Booking" b
SET "pricingPackageId" = (
  SELECT p."id"
  FROM "PricingPackage" p
  INNER JOIN "PricingRule" r ON r."id" = p."pricingRuleId"
  WHERE p."vehicleId" = b."vehicleId"
    AND p."isActive" = true
    AND r."tripType"::text = b."tripType"::text
    AND (
      (
        p."fromCity" IS NOT NULL
        AND p."toCity" IS NOT NULL
        AND lower(p."fromCity") = lower(trim(split_part(b."pickupLocation", ',', 1)))
        AND lower(p."toCity") = lower(trim(split_part(b."dropLocation", ',', 1)))
      )
      OR
      (
        p."fromCity" IS NULL
        AND p."toCity" IS NULL
        AND p."packageType" NOT ILIKE '%OUTSTATION%'
      )
    )
  ORDER BY p."createdAt" DESC
  LIMIT 1
)
WHERE b."pricingPackageId" IS NULL;

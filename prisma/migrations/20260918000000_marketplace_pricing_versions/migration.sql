-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "priceSnapshot" JSONB,
ADD COLUMN     "pricingQuoteId" TEXT;

-- CreateTable
CREATE TABLE "PricingRateVersion" (
    "id" TEXT NOT NULL,
    "pricingRuleId" TEXT NOT NULL,
    "pricingPackageId" TEXT,
    "scopeKey" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "vehicleCategory" "VehicleCategory" NOT NULL,
    "service" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT '',
    "origin" TEXT NOT NULL DEFAULT '',
    "destination" TEXT NOT NULL DEFAULT '',
    "area" TEXT NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "fare" DECIMAL(14,2) NOT NULL,
    "terms" JSONB NOT NULL,
    "smartReturnFare" DECIMAL(14,2),
    "createdBy" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "reviewReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "deactivatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingRateVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingPolicy" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT '',
    "service" TEXT NOT NULL DEFAULT '',
    "vehicleCategory" TEXT NOT NULL DEFAULT '',
    "vendorId" TEXT NOT NULL DEFAULT '',
    "route" TEXT NOT NULL DEFAULT '',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "data" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingQuote" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "rateVersionId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingQuote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PricingRateVersion_vendorId_service_vehicleCategory_status__idx" ON "PricingRateVersion"("vendorId", "service", "vehicleCategory", "status", "effectiveFrom");

-- CreateIndex
CREATE INDEX "PricingRateVersion_scopeKey_status_effectiveFrom_effectiveT_idx" ON "PricingRateVersion"("scopeKey", "status", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "PricingRateVersion_scopeKey_version_key" ON "PricingRateVersion"("scopeKey", "version");

-- CreateIndex
CREATE INDEX "PricingPolicy_kind_active_service_city_effectiveFrom_idx" ON "PricingPolicy"("kind", "active", "service", "city", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "PricingPolicy_key_version_key" ON "PricingPolicy"("key", "version");

-- CreateIndex
CREATE UNIQUE INDEX "PricingQuote_idempotencyKey_key" ON "PricingQuote"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PricingQuote_vendorId_createdAt_idx" ON "PricingQuote"("vendorId", "createdAt");

-- CreateIndex
CREATE INDEX "PricingQuote_expiresAt_idx" ON "PricingQuote"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_pricingQuoteId_key" ON "Booking"("pricingQuoteId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_pricingQuoteId_fkey" FOREIGN KEY ("pricingQuoteId") REFERENCES "PricingQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingRateVersion" ADD CONSTRAINT "PricingRateVersion_pricingRuleId_fkey" FOREIGN KEY ("pricingRuleId") REFERENCES "PricingRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingRateVersion" ADD CONSTRAINT "PricingRateVersion_pricingPackageId_fkey" FOREIGN KEY ("pricingPackageId") REFERENCES "PricingPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingQuote" ADD CONSTRAINT "PricingQuote_rateVersionId_fkey" FOREIGN KEY ("rateVersionId") REFERENCES "PricingRateVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Enforce half-open active windows even for writers outside the HTTP service.
ALTER TABLE "PricingRateVersion" ADD CONSTRAINT "PricingRateVersion_valid"
CHECK ("fare" >= 0 AND "version" > 0 AND ("smartReturnFare" IS NULL OR "smartReturnFare" >= 0)
 AND ("effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom")
 AND "status" IN ('DRAFT','PENDING','APPROVED','REJECTED','INACTIVE'));
ALTER TABLE "PricingPolicy" ADD CONSTRAINT "PricingPolicy_valid"
CHECK ("version" > 0 AND ("effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom")
 AND "kind" IN ('MASTER','BAND','FEE','TAX','CHARGES','DISCOUNT'));

CREATE FUNCTION ridegrid_pricing_rate_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Pricing history cannot be deleted'; END IF;
  IF TG_OP = 'UPDATE' AND
    (to_jsonb(NEW) - ARRAY['status','effectiveTo','reviewedBy','reviewReason','reviewedAt','deactivatedAt'])
    IS DISTINCT FROM
    (to_jsonb(OLD) - ARRAY['status','effectiveTo','reviewedBy','reviewReason','reviewedAt','deactivatedAt'])
  THEN RAISE EXCEPTION 'Rate terms are immutable; create a version'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW."scopeKey", 0));
  IF NEW."status" = 'APPROVED' AND EXISTS (
    SELECT 1 FROM "PricingRateVersion" r WHERE r."scopeKey" = NEW."scopeKey"
    AND r."id" <> NEW."id" AND r."status" = 'APPROVED'
    AND r."effectiveFrom" < COALESCE(NEW."effectiveTo", 'infinity'::timestamp)
    AND COALESCE(r."effectiveTo", 'infinity'::timestamp) > NEW."effectiveFrom"
  ) THEN RAISE EXCEPTION 'Overlapping approved rate'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER pricing_rate_guard BEFORE INSERT OR UPDATE OR DELETE ON "PricingRateVersion"
FOR EACH ROW EXECUTE FUNCTION ridegrid_pricing_rate_guard();

CREATE FUNCTION ridegrid_pricing_quote_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Pricing quote snapshots are immutable'; END $$;
CREATE TRIGGER pricing_quote_guard BEFORE UPDATE OR DELETE ON "PricingQuote"
FOR EACH ROW EXECUTE FUNCTION ridegrid_pricing_quote_guard();

CREATE FUNCTION ridegrid_booking_price_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD."priceSnapshot" IS NOT NULL AND (NEW."priceSnapshot" IS DISTINCT FROM OLD."priceSnapshot" OR NEW."pricingQuoteId" IS DISTINCT FROM OLD."pricingQuoteId")
 THEN RAISE EXCEPTION 'Booking price snapshot is immutable'; END IF;
 IF OLD."priceSnapshot" IS NOT NULL AND (
   ROW(NEW."baseFare",NEW."finalFare",NEW."taxAmount",NEW."discountAmount",NEW."extraCharges",NEW."vendorEarning",NEW."platformCommission",NEW."vendorId",NEW."vehicleId",NEW."pricingPackageId",NEW."pickupDateTime",NEW."tripType")
   IS DISTINCT FROM
   ROW(OLD."baseFare",OLD."finalFare",OLD."taxAmount",OLD."discountAmount",OLD."extraCharges",OLD."vendorEarning",OLD."platformCommission",OLD."vendorId",OLD."vehicleId",OLD."pricingPackageId",OLD."pickupDateTime",OLD."tripType")
 ) THEN RAISE EXCEPTION 'A confirmed quote cannot be repriced; use separate adjustments or a new booking'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER booking_price_guard BEFORE UPDATE ON "Booking"
FOR EACH ROW EXECUTE FUNCTION ridegrid_booking_price_guard();

CREATE FUNCTION ridegrid_pricing_policy_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Pricing policies cannot be deleted'; END IF;
 IF (to_jsonb(NEW) - ARRAY['active','effectiveTo']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['active','effectiveTo'])
 THEN RAISE EXCEPTION 'Policy terms are immutable; create a version'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER pricing_policy_guard BEFORE UPDATE OR DELETE ON "PricingPolicy"
FOR EACH ROW EXECUTE FUNCTION ridegrid_pricing_policy_guard();

CREATE FUNCTION ridegrid_pricing_audit_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD."entityName" = 'Pricing' THEN RAISE EXCEPTION 'Pricing audit evidence is immutable'; END IF;
 IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER pricing_audit_guard BEFORE UPDATE OR DELETE ON "AuditLog"
FOR EACH ROW EXECUTE FUNCTION ridegrid_pricing_audit_guard();

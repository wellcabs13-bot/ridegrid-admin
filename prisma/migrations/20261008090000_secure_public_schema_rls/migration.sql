-- Security hardening (Supabase Advisor: rls_disabled_in_public, sensitive_columns_exposed).
-- RideGrid reads and writes these tables only from the server, through Prisma connected as the owner role
-- (postgres, BYPASSRLS). Nothing uses the Supabase Data API, so no client-facing policy is needed.
-- Enabling RLS with no policy denies anon/authenticated entirely; the REVOKEs remove the direct grants as well.
-- No data, tables, columns or indexes are changed.

-- 1) Row Level Security on the 35 public tables that did not have it.
ALTER TABLE "public"."BookingSequence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."CRMAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."CRMConversionEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."CorporateApprovalRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."CorporateApprovalStep" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."CorporateBookingTraveller" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."CorporateBudget" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."CorporateBudgetAlert" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."CorporateBudgetAllocation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."CorporateCommercialProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."CorporateWalletTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."CustomerSavedRoute" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."DocumentRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."FileAsset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."FinanceAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."FinancePenalty" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."FinanceReconciliation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."FinanceRefund" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."FinanceSettlement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Journal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."JournalEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."PricingPolicy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."PricingQuote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."PricingRateVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."PushDevice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."SmartReturnListing" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."WebsiteSeoCompetitor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."WebsiteSeoEntity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."WebsiteSeoKeyword" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."WebsiteSeoPage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."WebsiteSeoScaleItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."WebsiteSeoScaleRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."WebsiteSeoSearchObservation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."WebsiteSeoTemplate" ENABLE ROW LEVEL SECURITY;

-- 2-4) Client-role privileges. Guarded so the migration also runs on a database without Supabase roles.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    -- Client roles get no direct table or sequence privileges anywhere in public (a no-op where already revoked).
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
    -- Trigger guard functions are internal and must not be callable through the Data API (/rpc).
    -- Triggers check EXECUTE only when created, so existing triggers keep working.
    REVOKE EXECUTE ON FUNCTION public.ridegrid_pricing_rate_guard() FROM PUBLIC, anon, authenticated;
    REVOKE EXECUTE ON FUNCTION public.ridegrid_pricing_quote_guard() FROM PUBLIC, anon, authenticated;
    REVOKE EXECUTE ON FUNCTION public.ridegrid_booking_price_guard() FROM PUBLIC, anon, authenticated;
    REVOKE EXECUTE ON FUNCTION public.ridegrid_pricing_policy_guard() FROM PUBLIC, anon, authenticated;
    REVOKE EXECUTE ON FUNCTION public.ridegrid_pricing_audit_guard() FROM PUBLIC, anon, authenticated;
    -- Objects that later Prisma migrations create must not be granted to client roles by default.
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
  END IF;
END
$$;

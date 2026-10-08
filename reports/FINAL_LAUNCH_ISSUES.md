# ISSUES
| # | Sev | Issue | Status |
|---|-----|-------|--------|
| 1 | CRITICAL | `.env` is TRACKED in git (committed in 43bc07f) and has uncommitted edits with PayU key/salt, Zoho key, JWT secret. `.gitignore` now has `.env*` but that does not untrack it. Do NOT commit .env. | Open: needs `git rm --cached .env` + secret rotation (owner) |
| 2 | HIGH | Homepage 9-13 s TTFB live (force-dynamic + pricing query) | Fixed in working tree (revalidate 300); needs deploy |
| 3 | HIGH | Info/contact/corporate pages ~3.4 s TTFB | Fixed in working tree; needs deploy |
| 4 | HIGH | Functions run in iad1 though vercel.json `regions:["bom1"]` (x-vercel-id bom1::iad1). vercel.json is untracked (never committed) so the setting may not be in the deployed build; Vercel project setting must also be Mumbai | Open: commit vercel.json / set project region in dashboard |
| 5 | MED | `/` canonical is `https://www.wellcabs.com` (no trailing slash) vs sitemap `.../` | Cosmetic; equivalent URL |
| 6 | MED | 5 static pages + home lacked JSON-LD live; home fixed in working tree | Home fixed; others pending |
| 7 | LOW | Only 14 of 210 route pages have their reverse route page; no duplicate clusters found by title/desc (all unique) | No action; reversed routes kept as distinct journeys |
| 8 | INFO | `PRICING_ERROR` is only the generic 500 catch in lib/services/pricing/access.ts; not reproducible from code/tests (migrations current, 939 tests pass). Needs live repro with logs | Open (needs Vercel logs) |

## Update 2026-10-08 (continuation)
| # | Sev | Issue | Status |
|---|-----|-------|--------|
| 9 | CRITICAL | LIVE MARKETPLACE RETURNS 0 LISTINGS for every service. Root cause: all 9 APPROVED rate versions pin `terms.operational.driverId = cmupp8wu00009l804yttzwpr1` (Atharva), but the only verified vehicle (Hatchback `cmupp3eqm0008l804pxe0rw57`) was reassigned on 2026-10-07 to driver `cmuxp1j2o0006l306kv6c9vos` (AK, also shared with the Sedan). QuoteService.assertAlignedPair rejects -> PRICE_UNAVAILABLE -> listing silently dropped. Rules/engine are correct (exact car+driver pricing by design). Other vehicles (SUV, Sedan) are `isVerified=false` and have no rates. | Code: logging added. DATA FIX PENDING OWNER: either reassign the hatchback back to driver `cmupp8wu00009l804yttzwpr1`, or re-create/approve rates for the new driver. Not executed (production inventory). |
| 10 | HIGH | Live /api/marketplace/search takes 8-22 s; same query runs 0.87 s locally -> function in iad1 vs DB in Mumbai (see #4) | Needs Vercel project region = Mumbai (bom1), redeploy |
| 11 | MED | Changing a vehicle's driver silently invalidates all approved rates with no admin warning | Mitigated: warn log + `scripts/check-rate-alignment.ts` (read-only). Admin UI warning = follow-up |
| 12 | INFO | `.env` untracked from git index (kept locally). Still must rotate secrets. | Done (commit) |
| 13 | INFO | `/api/marketplace/debug` is admin-gated (401 anonymous) | OK |

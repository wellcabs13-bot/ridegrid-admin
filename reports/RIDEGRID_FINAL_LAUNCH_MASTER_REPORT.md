# RideGrid / Wellcabs — Final Launch Master Report (2026-10-08)
Branch `phase-4-customer-module`. Local commits (NOT pushed, NOT deployed): 7561b2d, 42f5124, 1ae92b8, aef35cd (on top of c07b008).

## 1. Verdict: NOT READY TO LAUNCH — blocked on 3 owner actions (below)
| Module | Status |
|---|---|
| Website (content/SEO) | PASS — 414/414 URLs 200, unique titles/descriptions, no thin pages |
| Website speed | PARTIAL — fix committed, not deployed; region problem open |
| Marketplace/pricing | FAIL (live data state) — 0 listings; root cause known, code/rules OK |
| Super Admin / Corporate portal | PARTIAL — tests pass; slowness is the same region issue; no new optimization done |
| Mobile apps (code) | PASS — tsc + unit tests, 4 apps |
| Android release builds | BLOCKED — EAS free-plan builds exhausted until 2026-11-01; no release keystore locally |
| Prod data reset | PENDING owner approval (nothing deleted) |
| Security | PARTIAL — .env untracked; secrets must be rotated |
| Deployment | NOT DONE (needs owner go-ahead) |

## 2. Root causes found
1. **Empty marketplace**: all 9 APPROVED rate versions pin driver `cmupp8wu00009l804yttzwpr1`; the only verified vehicle (Hatchback `cmupp3eqm0008l804pxe0rw57`) was reassigned 2026-10-07 to driver `cmuxp1j2o0006l306kv6c9vos`. QuoteService.assertAlignedPair -> PRICE_UNAVAILABLE -> listing dropped silently. SUV and Sedan are unverified and have no rates. Reproduced locally against the live DB (0.87 s, 0 listings) and on the live API.
2. **Slow live responses**: `x-vercel-id: bom1::iad1` — functions run in the US, DB is Supabase ap-south-1. Search 8-22 s live vs 0.87 s local. vercel.json (`bom1`) was uncommitted; now committed, but the Vercel project setting must also be Mumbai.
3. **Slow public pages** (/ 9-13 s, info pages ~3.4 s): uncached navigation resolver; fixed in commit 7561b2d (reuse existing 5-minute cache). After-deploy numbers: NOT YET MEASURED.
4. `.env` (PayU, Zoho, JWT secrets) was tracked in git since commit 43bc07f.

## 3. Fixes committed
- 7561b2d perf(website): cached chrome for info/contact/corporate pages; homepage ISR + Organization/WebSite JSON-LD; vercel.json bom1.
- 1ae92b8 `.env` removed from git index (file kept on disk).
- aef35cd marketplace: warn log with reason code when a priced listing is hidden; `scripts/check-rate-alignment.ts` (read-only) lists misaligned rates. No pricing logic changed.

## 4. Tests (local, 2026-10-08)
tsc web PASS; tsc x4 mobile PASS; vitest 91 files/939 tests PASS (re-run after changes); mobile unit tests PASS (10/14/9/10); prisma validate PASS; prisma migrate status up to date (28); next build PASS; lint warnings only. Playwright e2e: NOT RUN. Authenticated Super Admin/Corporate flows: NOT RUN (no test credentials; DB in .env is production — I avoided creating records).

## 5. Android artifacts
Existing EAS builds are all `preview` internal APKs (version 1.0.0): customer code 4 (2026-10-02, sha 5e650db), vendor (2026-10-04, c74d7c6), driver (2026-10-04, 58e94a3), corporate employee (2026-10-02, 5e650db). Signed by EAS-managed credentials but they are preview builds, NOT Play-ready AABs, and predate the current customer-app edits.
Attempt: `eas build --profile production` for driver -> FAILED at queue: "account has used its Android builds from the Free plan this month; resets Nov 01 2026". Side effect: EAS remote versionCode for driver is now 2. No AAB exists. Package IDs: com.ridegrid.customer / .vendor / .driver / .corporate. No public store buttons should be added.

## 6. Data classification (production DB; read-only counts)
users 11, vendors 1, drivers 3, vehicles 3 (all AVAILABLE; 1 verified), customers 4, bookings 3 (2 TRIP_COMPLETED, 1 CANCELLED), pricing rules 3, packages 18, approved rate versions 9. These look like QA/test records but are not positively identified as disposable; payments/audit/identity tables not touched. **Nothing deleted.** Provide exact IDs for approval before any cleanup; keep Super Admin, RBAC, pricing config, audit/payment records.

## 7. Not done (honest list)
Super Admin/Corporate query-level optimization; Playwright e2e; Search Console analysis (no access); Lighthouse/CWV; mobile device performance; JSON-LD on about/contact/etc.; website visual polish; deployment and post-deploy smoke test; uncommitted customer-mobile UI changes (~40 files) left untouched and uncommitted.

# FINAL LAUNCH PROGRESS (checkpoint log)
Branch: phase-4-customer-module @ c07b008 (HEAD) + large UNCOMMITTED working tree from prior sessions. Nothing committed/pushed/deployed by this run yet.

## Stage 1 — Baseline: DONE (2026-10-08)
- tsc (web) PASS; tsc in all 4 mobile apps PASS; vitest 91 files / 939 tests PASS; prisma validate PASS;
  `next build` PASS; `next lint` warnings only; `prisma migrate status`: 28 migrations, DB up to date.
- Live site: 414 sitemap URLs, all 200, no redirects, 0 dup titles/descriptions, 0 thin pages (<300 words; min 391),
  1 H1 everywhere, no noindex. 408/414 have JSON-LD.
## Stage 6 (partial) — public-site speed fix: DONE in working tree, NOT deployed
- Finding: live `/` TTFB 9-13 s, `/about` `/contact` `/accessibility` `/account-deletion` ~3.4 s, `/corporate-travel` ~2.3 s;
  generated pages (routes/cities/...) ~0.3-0.4 s. Response header `x-vercel-id: bom1::iad1` — function executes in iad1 although vercel.json says bom1.
- Root cause (pages): info/contact/corporate pages used the uncached `resolvePublicChrome` (sequential DB reads + per-link page lookups, DB in ap-south-1) with force-dynamic.
- Fix: those pages now use the existing 5-minute `resolvePhase1Chrome` cache (same one the fast pages use). Files: components/website-public/InfoPage.tsx, app/(website-public)/contact/page.tsx, app/(website-public)/corporate-travel/page.tsx.
- Prior-session uncommitted change already present: homepage `revalidate=300` + Organization/WebSite JSON-LD.
- Verify after deploy: re-curl TTFB for / /about /contact.
## Not started / pending: see FINAL_LAUNCH_ISSUES.md and FINAL_LAUNCH_BLOCKERS.md

## Checkpoint 2
- Mobile unit tests PASS: corporate 10, customer 14, driver 9, vendor 10.
- Local commit 7561b2d (speed fix + vercel.json + reports). NOT pushed, NOT deployed.
- Uncommitted prior-session work remains (customer-mobile UI, wallet feature, .env, google-services.json, tsconfig, .gitignore). Review before committing; never commit .env.
- NEXT: owner go-ahead to push/deploy -> re-measure TTFB; then marketplace/pricing live repro (needs Vercel logs), Playwright e2e, EAS release builds (needs signing creds), prod data classification (read-only counts).

## Checkpoint 3
Marketplace root cause found (driver mismatch), logging + check script committed (aef35cd). .env untracked (1ae92b8). EAS production build BLOCKED (free-plan quota until 2026-11-01). Master report + handover written. Remaining: deploy, post-deploy timing, admin/corporate optimization, e2e, data cleanup (needs approval).

## Checkpoint 4 (2026-10-10)
- Commits: 23afcdc (pricing alignment notice + rateWarnings on driver/vehicle reassignment, +4 tests, vitest 943 pass), b75c8e5/.gitignore (env, google-services, keystores, apk/aab, credentials.json), 13e4aa4 (lint fix). Not pushed.
- `next build` failed once on a lint error in my new notice (apostrophe) -> fixed 13e4aa4; full rebuild still to re-run before push.
- Local Android toolchain WORKS: JDK 17 (Gradle-provisioned, ~/.gradle/jdks), SDK build-tools 36, platform 36. Fixes needed: subst R: -> apps (short paths, avoids CMake/ninja path-length failure); local-only patch of node_modules/@react-native/gradle-plugin/settings.gradle.kts foojay-resolver 0.5.0->1.0.0 (Gradle 9 incompat; .orig backup kept per app); JDK 25 (Android Studio jbr) fails CMake.
- Vendor release APK built (arm64-v8a, DEBUG-signed, com.ridegrid.vendor 1.0.0 code 1, 36 MB). Customer, Corporate, Driver (needed `expo prebuild`) building.
- Release signing: no keystore on PC. Owner chose "download existing EAS keystores". Needs `eas credentials` (interactive) per app -> credentials.json; then `node scripts/android/sign-apk.cjs <apk> <credentials.json> <out.apk>`.
- Dead mock-data components (68 files) listed in reports/DEAD_CODE_CLEANUP_PENDING.md; bulk delete was blocked, awaiting approval.

## Checkpoint 5 (2026-10-10)
- e5a8b8a removed 68 orphan mock components + 9 data modules (owner-approved). tsc, vitest 943, next build PASS.
- 4 local debug-signed arm64 APKs built (release-artifacts/android-apk/debug-signed, git-ignored; manifest alongside). Install OK on emulator; launch untestable on x86_64 emulator (arm64-only libs). Real-phone test pending. Release signing pending EAS keystore download by owner.
- Local build recipe: build from short path copies (C:\b\{c,d,e}); JDK17 from ~/.gradle/jdks; foojay-resolver 1.0.0 patch in node_modules; local.properties must use forward slashes.
- Not pushed / not deployed. Emulator stopped.

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

# Wellcabs Live SEO + Performance Audit
Date: 2026-10-08 · Site: https://www.wellcabs.com · Read-only (no code/deploy/DB changes)

## A. Total live public URLs
- **414** URLs in `/sitemap.xml` (single urlset, no sitemap index; `/sitemap_index.xml` = 404). All 414 returned HTTP 200 with no redirects.
- Plus public pages outside the sitemap: partners, 6 legal pages (see C/F), /marketplace, /vehicles, /pricing, /support (not individually evaluated for SEO).

## B. Counts by category (sitemap)
| Category | URLs |
|---|---|
| Homepage | 1 |
| City | 7 |
| Route | 210 |
| Area (extra) | 105 |
| Service (service/city) | 28 |
| Vehicle (vehicle/city) | 35 |
| Tour | 20 |
| Airport | 3 |
| Other (about, accessibility, account-deletion, contact, corporate-travel) | 5 |

## C. Indexing status (from live HTML meta/headers; actual Google index state = Unknown)
- Indexable: **414/414** (`index, follow`, no X-Robots-Tag, not blocked by robots.txt). Google-indexed count: **N/A** (no GSC access).
- Noindex but live and NOT in sitemap: /partners and legal pages (privacy-policy, terms-and-conditions, cookie-policy, disclaimer, cancellation-refund-policy, payment-refund-information, business-travel-terms all return 200; the two checked + partners are `noindex, follow`). Looks intentional (`review` flag in INFO_PAGES) but confirm before launch.
- /website-preview → 307 (redirect); admin-ish paths disallowed in robots.txt.
- Canonical present on all 414; self-referencing everywhere except homepage (`https://www.wellcabs.com` vs. sitemap `…/`; trivial).
- Exactly one H1 on all 414. Titles and meta descriptions present on all 414; no duplicate titles or descriptions.
- Apex and http redirect (308) to https://www.wellcabs.com/. Unknown URLs correctly 404.

## D. Google ranking data
**N/A – not verified.** Repo has Search Console integration code (`lib/website-seo/publishing/search-console`) but no credentials in `.env` and no google-site-verification tag found on the homepage; no authorized GSC data accessible. No keywords, impressions, clicks, CTR, positions or top-3/10/20 counts are reported.

## E. Performance (Lighthouse 12, headless Chrome, production, run from this machine, single run each)
| Page | Device | Perf | SEO | LCP | FCP | CLS | TBT | Speed Index |
|---|---|---|---|---|---|---|---|---|
| Home | Mobile | 88 | 100 | 2.2s | 1.3s | 0 | 50ms | **15.1s** |
| Home | Desktop | 90 | 100 | 0.5s | 0.3s | 0 | 0 | **6.4s** |
| /cities/aurangabad | Mobile | 99 | 100 | 2.0s | 1.2s | 0 | 40ms | 1.7s |
| /cities/aurangabad | Desktop | 100 | 100 | 0.5s | 0.3s | 0.011 | 0 | 0.7s |
| /routes/aurangabad-to-ahmednagar-cab | Mobile | 96 | 100 | 2.0s | 1.0s | 0 | 70ms | 4.4s |
| /routes/…cab | Desktop | 100 | 100 | 0.5s | 0.3s | 0 | 0 | 0.8s |

- INP: **N/A** (lab only; TBT used as proxy, low). Field Core Web Vitals / CrUX: **N/A**.
- TTFB: Lighthouse reported ~10 ms (warm CDN). But `curl` of `/` measured **8.9–9.7 s TTFB on three consecutive requests**; header `Cache-Control: private, no-cache, no-store` and `X-Vercel-Cache: MISS`. Legal pages ~3.1 s, /marketplace 2.4 s, partners 1.7 s; city/route/area pages were fast in the crawl (~0.4 s avg). The first sweep request to `/` took ~14 s. Lighthouse's 10 ms likely reflects a cached/different response, so treat the curl figures as the real uncached server cost and re-verify.

## F. Broken / missing pages
- Broken (non-200) sitemap URLs: **0**.
- Missing from sitemap: no `lastmod` on any entry; legal pages/partners absent (noindex – OK if intended); /marketplace, /vehicles, /pricing, /support not in sitemap (may be intentionally non-SEO).
- Schema: only `WebPage` + `BreadcrumbList` on 408 pages. **Homepage and 5 "Other" pages have no JSON-LD at all**; no Organization/LocalBusiness, FAQPage, Product/Offer, or TaxiService/Service schema anywhere.

## G. Top 10 SEO/performance problems
1. Homepage server response ~9 s TTFB (no-store, dynamic render) – measured with curl; Speed Index 15 s mobile.
2. Homepage and static info pages have no structured data (no Organization/LocalBusiness/WebSite).
3. No rich-result schema on money pages (Service/TaxiService, Offer/price, FAQ, Review) – only WebPage+Breadcrumb.
4. Title tags too long (>60 chars) on 7/7 city, 101/210 route, 49/105 area, 25/35 vehicle pages – truncation in SERPs.
5. Meta descriptions >160 chars on all 7 city pages (and homepage).
6. Template copy error: "Book a Aurangabad to Ahmednagar cab" (grammar) on route descriptions; also tour descriptions have a stray double space and repetitive boilerplate ("Read journey guidance and related routes").
7. Sitemap lacks `lastmod` and no index/segmentation; homepage canonical lacks trailing slash vs sitemap.
8. Brand inconsistency: titles use "RideGrid" vs domain "Wellcabs"; homepage title "RideGrid by Wellcabs"; info pages use "| Wellcabs".
9. Legal/policy pages 3 s TTFB and noindex – confirm intent; (Google Play/Stripe-style reviewers sometimes need them crawlable).
10. Legacy JavaScript, unused CSS, bf-cache failure, image-delivery and forced-reflow flagged by Lighthouse on homepage; 105 thin area pages and 210 template routes at risk of "duplicate/thin" treatment (not verified for content uniqueness).

## H. Priority fixes before launch
1. Make `/` cacheable (ISR/static or remove no-store); target TTFB <0.8 s. Re-measure with WebPageTest/CrUX.
2. Add Organization/LocalBusiness + WebSite JSON-LD to homepage; add Service/Offer/FAQ schema to city/route/service templates.
3. Shorten title templates to ≤60 chars and city descriptions to ≤155; fix "Book a {origin}" grammar.
4. Add `lastmod` to sitemap; normalize homepage canonical; submit sitemap in Search Console and verify the property (add verification) to get real ranking data.
5. Confirm noindex on legal/partners is intended; make them fast.
6. Review area/route pages for unique content before expecting indexing.
7. Fix homepage JS/CSS/image findings from Lighthouse.

Method notes: crawl of 414 sitemap URLs via HTTP GET (8 concurrent); regex extraction of title/description/H1/canonical/robots/JSON-LD; Lighthouse single run per page/device (variance expected). Raw data kept in scratchpad only.

# W6 Central SEO Engine

## Use and boundaries

`websiteSeoEngine.generate({ entityId, pageId?, persist? })` loads existing W2/W3 data, W4 keywords, and the mapped `metadata.contentW5.result`. `createSeoPlan(input)` is the pure deterministic planning layer. The API is `POST /api/website-seo/seo/generate`; it accepts identifiers and the optional persistence boolean only.

W6 neither regenerates content nor writes W4/W5 records. W5 source loading, brief construction, structured-content validation and quality guardrails are reused. Missing, malformed, mismapped or unapproved W5 content remains visible as a quality/indexability concern. Stored quality flags are rechecked with W5 rather than accepted as factual evidence.

W7 still owns publishing, rendered metadata/schema, actual redirect configuration, XML sitemap publication, indexing submissions, Search Console and monitoring. No such operations run here.

## Canonical and metadata policy

W5 title/description candidates are reused with whitespace normalization. Length checks flag excessive or short copy instead of breaking words. W4 primary keyword alignment and heading context remain explicit.

Canonical paths come exclusively from the selected existing W3 page. Query strings/fragments are removed; percent encoding, repeated slashes and trailing slashes are normalized. Unsafe external, protocol-relative, traversal, encoded separator and malformed paths are rejected. The resolver reads the existing Next.js trailing-slash setting (currently its default, false).

Optional deployment configuration `WEBSITE_SEO_SITE_URL` (or `NEXT_PUBLIC_SITE_URL`) must be a valid HTTP(S) origin without credentials, path, query or fragment. No domain is embedded in production code. When no origin is configured, the plan retains a relative path and null absolute URL, recommends NOINDEX and excludes the page from sitemap eligibility. No environment file is changed by W6.

## Indexability, links and structured data

Indexability requires READY/PUBLISHED lifecycle, ACTIVE entity, absolute valid canonical, editorially approved W5 content passing its checks, and no detected technical/duplicate blockers. Sitemap eligibility additionally requires PUBLISHED status. These are recommendations, not publication actions.

Internal links are selected from W5 semantic suggestions and revalidated against existing published target pages and active entities. W2 parent/child/sibling relationships, identity/path consistency, deduplication, no-self-link rules, stable order and an eight-link cap apply. No business-module URL is manufactured.

JSON-LD uses an allowlist: WebPage, BreadcrumbList when a real parent target exists, and FAQPage for nonempty, unique static FAQ pairs present in W5 sections. FAQs requiring unresolved live bindings are omitted. Unsafe W5 content or missing absolute URL causes safe schema omission. Ratings, offers, inventory and other commercial schema properties are never generated. JSON-LD is returned as structured data, not injected into HTML. Consumers must safely serialize it when rendering in W7.

Schema references: [WebPage](https://schema.org/WebPage), [BreadcrumbList guidance](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb), and [FAQPage](https://schema.org/FAQPage). Schema validity does not promise a search feature or ranking.

## Redirect and duplicate signals

Historical paths are read only from page metadata `previousPathnames` (string array). Known redirect edges may be supplied in `redirectRecommendations` (`from`/`to` pairs). None are invented or published. A stored path normalization can produce a 308 recommendation; query variations only affect canonical resolution. Self-redirects, conflicting sources and known target redirects/chains/loops are rejected. Detection is limited to the supplied edges.

Canonical collisions are checked against existing W3 paths. Normalized title/description duplication is checked against persisted W6 plans. W5 exact-copy detection and thin/doorway risk checks remain in use. This does not claim to detect every semantic near-duplicate across unpersisted plans.

## Persistence and ownership

The existing page metadata receives a `seoW6` namespace with identifiable `W6` / `GENERATED_DRAFT` ownership and a deterministic fingerprint. Unrelated metadata, W3 generation data and W5 content are preserved. No schema change or migration is required.

Preview does not write. Identical generated drafts return UNCHANGED without modifying timestamps. Published/archived pages, manual `seo`/`seoOverrides`, recognized editorial controls and differing existing W6 plans return SKIPPED. W6 does not implement editorial replacement. Diagnostics, including NOINDEX or blocked plans, may be saved as draft plans; persistence never advances lifecycle or authorizes publishing.

Writes use a serializable transaction and page revision check. Concurrent conflicts may require a caller retry. W1–W5 persistence behavior is frozen; W6 does not change earlier methods that replace page metadata.

## Validation

```text
npx prisma validate
npx tsc --noEmit
npx vitest run tests/website-seo/w6-seo-engine.test.ts tests/website-seo/w6-seo-api.test.ts
npx tsx scripts/website-seo/w6-seo-engine-db-test.ts
npm run build
```

The PostgreSQL gate creates uniquely identified temporary SEO records, checks W4/W5 consumption, preview isolation, idempotency, metadata/editorial/lifecycle protection and duplicate/canonical conflicts, then deletes only its temporary records and verifies cleanup.

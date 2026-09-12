# W7 Publishing + Indexing Engine

`publishingIndexingEngine` supports preview, explicit publish/unpublish, explicit discovery sync and sitemap collection. W3 page status remains the lifecycle source. Metadata namespaces `publishing` and `indexing` carry W7 ownership and preserve W3/W5/W6/editorial data.

Readiness requires an existing indexable PASS W6 plan and fresh W6 evaluation against current W5 content, entity and template. W6 is evaluated for the proposed PUBLISHED status, while the actual source must already be READY/PUBLISHED. Content approval is never granted automatically. Missing origin, NOINDEX, quality warnings, missing content, protected ownership and unsupported public paths block publication.

URLs reuse W6 canonical rules and its optional `WEBSITE_SEO_SITE_URL` / `NEXT_PUBLIC_SITE_URL` origin. Without origin configuration, relative paths remain represented but publication is blocked. No deployment environment is modified.

## HTTP interfaces

- POST `/api/website-seo/publishing/preview`
- POST `/api/website-seo/publishing/publish`
- POST `/api/website-seo/publishing/unpublish`
- POST `/api/website-seo/indexing/sync`

Each POST takes only existing `entityId` and `pageId`. Preview never writes; providers are called only by explicit sync. Publication has a source-revision check and serializable transaction. Repeated publish and identical sync preserve timestamps. Concurrent source changes require a fresh retry. Publication locks/manual namespace ownership are respected. Unpublish moves W7-owned pages to READY, preserves content and prior publication details, and does not invent an external deindexing observation.

GET `/api/website-seo/sitemap` returns XML or a sitemap index; `?chunk=N` selects a chunk. Published W7 pages are cursor-loaded and revalidated through W6. Entries are sorted/deduplicated, XML escaped and split at 10,000 entries or a conservative byte limit below the protocol maximum. Lastmod comes from W7's actual publication timestamp. Validation currently runs per page; chunk generation does not introduce a cache or background worker.

The public catch-all handler serves only eligible W7 publications under the six W3 detail namespaces: `/routes/{slug}`, `/cities/{slug}`, `/services/{slug}`, `/airports/{slug}`, `/areas/{slug}`, `/vehicles/{slug}`. Other paths, drafts, protected or newly ineligible pages return 404. Custom template path layouts require a corresponding renderer before publication. Existing static/business routes remain in place. The minimal HTML renderer escapes W5 copy, uses W6 canonical/metadata/schema and internal links, and does not fabricate or resolve live business values.

## External service boundaries

The local indexing and Search Console providers require no credentials and make no external calls. External coverage/crawl remain UNKNOWN with no fabricated observation timestamp. Sitemap notification acceptance means acceptance only, never indexing. The Search Console adapter boundary supports sitemap notification, URL inspection and coverage retrieval. No Google Indexing API implementation, mass submission, ranking guarantee or indexing guarantee is included. External adapters should use the supplied idempotency key for discovery requests.

## Validation

```text
npx prisma validate
npx tsc --noEmit
npx vitest run tests/website-seo/w7-publishing.test.ts
npx tsx scripts/website-seo/w7-publishing-db-test.ts
```

The DB test uses a process-local test origin, temporary records, no external service calls, and verified cleanup. It checks preview isolation, publish/sync idempotency, unpublish preservation, ownership locks, public HTML and sitemap removal. Production build and W1–W6 tests are intentionally not run, per the W7 low-usage instruction.

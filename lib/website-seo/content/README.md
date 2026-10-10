# W5 AI Content Engine

## Entry points

`websiteContentEngine.generate({ entityId, pageId?, persist? })` loads existing W2 entities, W4 keywords and W3 pages/templates. `generateContentDraft(brief, provider?)` supports deterministic offline generation. `POST /api/website-seo/content/generate` accepts only the identifiers and persistence boolean; no caller-supplied business facts or provider credentials are accepted.

An explicit page must belong to the entity. Without a page ID, a sole non-archived page is used; ambiguous pages require a selection. With no existing page, a sole active template permits preview only. W5 never creates pages or templates. Only enabled W3 sections are generated, in their template order.

## Provider and data boundaries

The local provider requires no API key. `ContentGenerationProvider` returns untrusted structured data, which passes runtime shape checks and independent quality validation. `adaptWebsiteSeoAI` wraps the existing shared `WebsiteSeoAIProvider` interface without changing its implementation. The HTTP endpoint exposes only the local provider. There is no external dependency, API call, or secret in local generation.

Briefs retain the entity, a deterministic lifecycle-prioritized primary keyword, supporting keywords, intent, clusters, questions, selected template and page. Rejected/archived and foreign-entity keywords are excluded. No external SEO metrics are manufactured. Metadata consumption is limited to explicit identity/location strings (`fromCity`, `toCity`, `originCity`, `destinationCity`, `city`, `airportCode`). Other metadata is not treated as verified prose or commercial evidence.

Pricing, search, marketplace, inventory, reviews and trust sections contain declarative `REQUIRES_LIVE_RESOLUTION` bindings to the existing RideGrid resource and entity. They are not API URLs, fetched business values, or statements of availability. A future consumer must resolve those bindings through existing business services. Unknown fares, distances, times, inventory and ratings are never filled in.

Related suggestions use actual published W3 pages connected through W2 parent/child relationships. They are content suggestions, not final internal-link placement. Title and meta-description values are candidates; W6 remains responsible for final SEO decisions.

## Quality and editorial control

Independent checks cover enabled-section coverage, mismatched bindings/links/context, entity and primary relevance, empty copy, paragraph and heading repetition, FAQ duplication, stuffing, length, numeric/promotional claims, unsafe markup, thin-content and doorway risk. Existing W5 copy fingerprints detect exact duplicate text across pages. Numeric and promotional heuristics are intentionally conservative and are not proof of factual accuracy or a semantic near-duplicate detector. Editorial review remains mandatory, including for `PASS` output; sparse fallback drafts can return `REVIEW`.

`BLOCKED` drafts cannot persist. Other results may be stored **only as drafts**, in the existing `WebsiteSeoPage.metadata.contentW5` namespace. W3 metadata is merged and preserved; page status is never advanced. Non-DRAFT pages and recognized editorial/manual content are protected. Matching W5 draft fingerprints return `UNCHANGED` without changing timestamps. Any different existing W5 content—including an older machine draft—is preserved and returns `SKIPPED`; W5 does not implement an editorial replacement workflow. Updating or approving content belongs to an explicit future editorial flow.

The first write uses a serializable transaction, checks entity/template/page revisions and rechecks cross-page copy duplication. Concurrent transaction conflicts can require a caller retry. W3's existing page regeneration behavior remains frozen; callers should avoid regenerating a page containing editorial content through W3, whose current persistence method replaces page metadata.

## Targeted validation

```text
npx prisma validate
npx tsc --noEmit
npx vitest run tests/website-seo/w5-content-engine.test.ts tests/website-seo/w5-content-api.test.ts
npx tsx scripts/website-seo/w5-content-engine-db-test.ts
npm run build
```

The PostgreSQL gate creates uniquely identified temporary entities, a template, pages and a keyword, then deletes only those IDs in `finally` and verifies cleanup. It checks preview isolation, idempotency, related-page suggestions, W3 metadata preservation, editorial/published protection, and rejection of unsafe generated claims.

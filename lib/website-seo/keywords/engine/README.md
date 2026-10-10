# W4.5 Keyword Intelligence Engine

`KeywordIntelligenceEngine.generate(entityId, persist = false)` loads the existing entity and W3 pages through their repositories. The API accepts only `{ entityId, persist? }`. Pure `analyzeKeywords(entity, pages?, providers?)` supports offline analysis and replaceable discovery providers.

Discovery uses the real entity name for all six entity types. ROUTE optionally uses string metadata `fromCity`/`toCity` (or `originCity`/`destinationCity`); without both endpoints it uses the name without guessing endpoints. It makes no one-way, availability, pricing, or fleet claims. Providers supply candidate phrases, not external metrics.

Normalization reuses W4.1. Deduplicated candidates are sorted by code-point order. Clusters use entity identity and search purpose: booking (transactional/local), commercial, informational, or navigational. Primary selection uses word count, character count, then code-point order. Semantic classification is retained in `classification` and metadata; persisted `type` expresses PRIMARY/SECONDARY. `primaryKeywordKey` identifies a normalized phrase within the entity and requires no pre-existing ID.

Page mapping selects the sole published non-archived page, or the sole non-archived page when none are published. Ambiguity returns null. Page IDs/pathnames are advisory output and metadata, not a new foreign key or Page Engine.

Opportunity scoring is explicitly `INTERNAL_HEURISTIC_V1`: intent (10–35), entity relevance (25 for supplied entity candidates), word specificity (3 per word, capped at 20), commercial relevance (0 or 10), and primary importance (10 primary / 5 supporting), clamped to 0–100. Search volume, difficulty, CPC, and competition remain null. External metrics on existing records are preserved; this version does not ingest external metrics.

Persistence is insert-missing, in a serializable transaction with bounded retries for concurrent conflicts. It preserves **all** existing records, including lifecycle, links, metadata, metrics, and timestamps; it never deletes stale candidates. Returned analysis is a proposal; `persistence.records` contains actual stored records. Existing records are not refreshed when discovery rules or page mappings change. New secondary IDs are resolved only after insertion, and only linked to a root in the same cluster that is neither rejected nor archived. Incompatible human relationships remain untouched and are counted in `unresolvedRelationships` for newly inserted candidates.

Validation commands:

```text
npx prisma validate
npx tsc --noEmit
npx vitest run tests/website-seo/w45-keyword-engine.test.ts tests/website-seo/w45-keyword-api.test.ts
npx tsx scripts/website-seo/w45-keyword-engine-db-test.ts
```

The DB gate uses a uniquely named temporary entity, validates idempotency and concurrent insertion, and removes only that entity and its keywords in `finally`, then verifies cleanup. No schema change, migration, dependency update, or W4.4 gate modification is required.

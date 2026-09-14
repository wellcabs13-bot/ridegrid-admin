# RideGrid AI Image Engine

Dashboard: `/website-seo/website/media/ai-images` (Generate, Jobs, Assignments, Presets).
Authenticated API: `/api/website-seo/media/ai-images`; restricted to SUPER_ADMIN.
Homepage manager and individual page manager link to scoped generation controls.

## Deployment

Configure the web process and worker with:

```dotenv
AI_IMAGE_PROVIDER=openai
OPENAI_API_KEY=your_key_here
AI_IMAGE_MODEL=gpt-image-1
AI_IMAGE_DEFAULT_SIZE=1536x1024
AI_IMAGE_DEFAULT_QUALITY=high
```

The key must have access to the selected image model. Never use a NEXT_PUBLIC
key. Generation uses the OpenAI Images API, one PNG per request:
https://developers.openai.com/api/reference/resources/images

Run a supervised, continuously running worker from the repository root:

```sh
npm run website-seo:image-worker
```

For a scheduler that processes at most one job per invocation:

```sh
npm run website-seo:image-worker -- --once
```

Use the existing DATABASE_URL and a durable shared `storage/media` volume for
both processes. This reuses the existing FileStorageService and `/api/files/:id`
contract. Ephemeral storage is unsuitable for the existing media library and
generated images alike. No new database migration or external queue is required.
Do not run the worker in a short-lived web request. Provider timeout is four
minutes; permit at least five minutes for worker shutdown and file persistence.

## Editorial lifecycle

Choose pages and slots, optionally preview/edit a single prompt, then queue.
Bulk requests support 25 pages and 100 images maximum. Auto mode is off by
default. Enabling it queues hero and OG images after Page Factory creation,
including the existing scale and automation generation paths. The page API also
accepts `generateImages: true/false`. An image failure never rolls back page
creation; the response includes `images.queued` and an actionable `images.error`.

The worker atomically claims QUEUED → PROCESSING and saves PNG output as a
website-owned FileAsset plus DRAFT media metadata. Jobs preserve prompt,
negative prompt, preset snapshot, provider/model, size/quality, page context,
filename, dimensions, MIME type, actor and timestamps. Images are labeled
AI-generated in Media Library. GENERATED output must be approved. Approval can
atomically map to the requested slot, or the editor can assign an approved image
to another page/slot. Uploaded ACTIVE website images are also assignable.
Rejection removes every assignment belonging to that job. Removing an assignment
restores the prior category fallback or layout-safe placeholder. Regeneration
retains an existing approved assignment until the replacement is approved.
Archived media is never rendered.

No automatic paid retries occur. A worker interrupted for ten minutes marks the
job FAILED; check provider usage and Media Library before manually regenerating.
Provider calls and storage writes never run inside transaction retries. If a DB
write fails after storage, files are retained for inspection rather than deleted.
One PROCESSING job is allowed across workers. Configuration errors are actionable
dashboard errors and never affect the public website.

## Persistence and limits

The existing serializable SystemSetting pattern stores versioned presets, jobs,
automation and page-slot assignments under `website-seo.ai-image-engine.v1`.
This follows the current media/homepage architecture. Archive reviewed or failed
unassigned jobs to `website-seo.ai-image-history.<job-id>` before the 2,000 active
job safety limit. Media files and provenance are retained. No business tables,
booking rules, payment rules or publication metadata are modified.
The Jobs panel lists the latest 100 archived jobs and can restore them for reuse;
the API also accepts `action: "restore"` with any archived job id.

## Public rendering

Public readers join only website-owned images with reviewed assignments, without
calling providers. Assignment failures return empty slots; page/chrome database
failures fail closed and the homepage keeps its existing safe presentation.
Generated media cannot become unrelated category hero fallbacks. W7 publication
eligibility still gates generated pages; assigning an image does not publish one.

Homepage mapping: heroImage = hero, cardImage = route showcase,
sectionImage1 = services, sectionImage2 = corporate promo,
featuredImage = final CTA, ogImage = Open Graph/Twitter.
Generated-page mapping: hero image, supporting section/featured/gallery images,
card image in homepage discovery, and OG/Twitter metadata. The repository only
supports ROUTE, CITY, SERVICE, AIRPORT, AREA and VEHICLE entities; no unsupported
GUIDE/SEO entity family or fabricated content is added. The SEO Guide Banner
preset is available for existing supporting content.

## Validation

```sh
npx vitest run tests/website-seo
npx tsc --noEmit
npm run build
```

Tests use in-memory persistence and mocked providers. They do not create live
pages, write real media, or incur generation charges. A configured production
provider/worker smoke test remains an operational deployment check.

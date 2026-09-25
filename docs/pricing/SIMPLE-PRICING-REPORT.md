# Simplified pricing implementation

## Operator workflow

`/pricing` now opens with three tabs: **Vendor Rates**, **GST & Platform Fee**, and **Advanced**. Advanced lazily loads the existing workbench, including policies, approval queue, quote simulation, package tools, versions and audit history.

Vendor Rates follows vendor → aligned cars/drivers → service → business inputs → save. Searchable pair and city controls support multiple selections and select-all. The vendor table provides service, vehicle, driver, city/route and status filters, plus View, Create New Version and Deactivate actions. Technical identifiers and raw policy payloads stay out of the simplified UI.

Eligibility follows the actual schema: approved, nondeleted vendors with active user accounts; vendor-owned AVAILABLE vehicles; their currently aligned ACTIVE, nondeleted drivers with active accounts. Vehicle verification remains a separate existing marketplace eligibility check. Ownership and alignment are checked again on save and when using a quote.

## Services

- **One-way:** real pickup/drop city options, distinct endpoints, base fare and stored inclusion/extra terms. Waiting includes 30 free minutes; additional pickup/drop terms are ₹250 each. Actual additional stops/toll/parking remain subject to existing operational charge handling; this screen does not fabricate incurred extras.
- **Local:** separate 8-hour/80-km and 12-hour/120-km package identities, base rate, extra KM and extra hour rates. The server supports both applicable overages without adding driver allowance twice.
- **Roundtrip:** base/day is calculated with Decimal as KM/day × rate/km + daily driver allowance. Multiple destinations create separate package-bound versions for each selected car-driver pair. Booking has a trip-day control for these new roundtrip rates; changes request a new server quote. Trip metrics are recorded in the immutable quote snapshot. Extra distance is charged only beyond included KM × days.
- **Tours:** unavailable. The project contains the `TOUR_PACKAGE` pricing service label, but no Tour catalog model, Tour API or Tour-to-vehicle association relationship. The UI explains this gap and shows only the requested Pune/Mumbai origin choices. No tours or associations are invented.

## Persistence and protections

The existing `/api/pricing/manage` endpoint has a lightweight `view=simple` read and two actions, `simple-rates` and `simple-policy`. Bulk operations are transactional, bounded to 200 vehicle/destination combinations and use existing create/submit/version services, scope locks, optimistic version checks and audit evidence. Package records are lookup identities; subsequent fare edits create versions instead of mutating historical package fares. Marketplace display for new terms reads the selected server quote rather than stale package amounts.

New prices use a future effective boundary (default ten minutes ahead), preserve history and follow the existing approval bands. Out-of-band prices remain pending for the existing administrator approval/reason workflow. Existing Master Rules and required quote policies must be configured; this implementation does not seed or bypass them.

Central GST and fee settings use existing global TAX/FEE policies. Empty configuration shows **Not configured**. First-time GST configuration asks which amount is taxable. Existing tax bases, discounts, fixed fees, minimums, waivers, processing costs, scoped overrides and policy history remain intact. Multiple tax components or multiple central policy keys require Advanced review rather than a destructive flattening.

Existing Decimal calculations remain in use. New service terms opt into local/day behavior without changing legacy rate methods. Quote expiry, idempotency, version snapshots, vendor ownership, Smart Return, approval rules and immutable booked amounts remain in place. No schema or migration changes, production data changes or dependency additions were made by this task.

## Verification

- `npx prisma validate`: passed.
- `npx tsc --noEmit`: passed.
- Pricing engine, workflow, access, simple-service and simple-UI Vitest suites: 76 tests passed.
- `npx playwright test e2e/pricing.spec.ts --reporter=line`: 7 tests passed, including 390px/1440px guided entry, HTTP authorization and server-supplied multi-day quote display.
- `npm run build`: passed, including all 190 static pages. Existing unrelated lint warnings remain.

Browser interaction tests use explicitly intercepted test fixtures and never create real vendor rates or bookings. Database transaction behavior is exercised through mocked service boundaries and the existing workflow tests, not by writing to production. Existing unrelated lint warnings are left unchanged.

## Exact files changed for this pricing task

1. `app/pricing/page.tsx`
2. `app/api/pricing/manage/route.ts`
3. `app/api/pricing/quote/route.ts`
4. `app/marketplace/booking/MarketplaceBookingClient.tsx`
5. `components/pricing/SimplePricing.tsx` (new)
6. `lib/services/pricing/SimplePricingService.ts` (new)
7. `lib/services/pricing/RateService.ts`
8. `lib/services/pricing/QuoteService.ts`
9. `lib/services/pricing/engine.ts`
10. `lib/services/marketplace/MarketplaceListingService.ts`
11. `tests/unit/pricing-simple.test.ts` (new)
12. `tests/unit/pricing-simple-ui.test.tsx` (new)
13. `tests/unit/pricing-workflow.test.ts`
14. `e2e/pricing.spec.ts`
15. `docs/pricing/SIMPLE-PRICING-REPORT.md` (new)

Earlier website/pricing work and unrelated working-tree changes are preserved and are not part of this file list.

## Run locally

```powershell
Set-Location 'C:\Users\Wellcabs\Desktop\RideGrid\ridegrid-admin'
npm run dev
```

Open `http://localhost:3000/pricing` with an authorized Super Admin, Finance or Vendor account. Production uses the normal `npm run build` / `npm run start` workflow; this change requires no new migration or environment variable.

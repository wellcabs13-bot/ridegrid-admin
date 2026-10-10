# RideGrid Integration Map

Date: 2026-09-25. Branch: `phase-4-customer-module`.

This map was produced by a direct, evidence-based audit of the live codebase (not by trusting prior session reports at face value — several were found stale, see the Corporate section). Status legend: **CONNECTED** / **PARTIAL** / **DISCONNECTED** / **DUPLICATED** / **DEAD** / **RISKY**.

---

## 1. Customer: Search → Pricing → Availability → Booking → Payment

| Hop | Status | Evidence |
|---|---|---|
| Search (Website + Customer App) | CONNECTED | `app/api/marketplace/search`, `app/api/marketplace/listings` back both `app/marketplace/results/MarketplaceResultsClient.tsx` and `apps/customer-mobile/app/results.tsx` — one `MarketplaceListingService`, no separate mobile search logic. |
| Pricing / Quote | CONNECTED | `lib/services/pricing/QuoteService.ts` (`quote()`) is the single quote authority: idempotent, transactional, Decimal-based, binds to vehicle/vendor/driver alignment, produces an immutable persisted `pricingQuote` row with `expiresAt`. Website (`app/api/pricing/quote/route.ts`) and customer-mobile (`checkout.tsx`, `payment.tsx`) call the same endpoint. Hardened Sept 18 (see `docs/pricing/AUDIT.md`): Decimal money, 76 unit + 7 e2e tests passing. |
| Availability | CONNECTED | `lib/services/marketplace/BookingAvailabilityService.ts` (`findBookingConflict`) is the single conflict-check module, checked at quote-precheck time and again inside the commit transaction (race-safe double-check, not duplicated logic). |
| Quote → Booking commit | CONNECTED | `lib/services/booking/MarketplaceBookingService.ts` (`commitMarketplaceBooking`), `Serializable` isolation, one-time quote consumption, single `Booking` row + status history + transaction row. Explicit code comment: "Shared marketplace booking commit used by the website/customer checkout and the corporate employee app." |
| Payment (Razorpay + cash) | CONNECTED (payment webhook idempotency not deep-audited) | `lib/payments/razorpay.ts`, `app/api/payments/verify`, both website and mobile route through the same handlers, update the same `Transaction`/`Booking` records. |
| **`app/api/bookings/create/route.ts`** | **RISKY → FIXED (restricted)** | 754-line legacy route predating the QuoteService hardening; used the older `PricingService` in parallel with `commitMarketplaceBooking`'s path, and had no confirmed frontend caller in `app/` or `apps/customer-mobile`. Any authenticated user (including `CUSTOMER`) could previously call it directly with a client-chosen `vendorId`/`vehicleId`, bypassing quote consumption. **Fixed this session**: restricted to `SUPER_ADMIN`/`OPERATIONS` only. Recommend a full decision on whether to retire it in favor of `commitMarketplaceBooking` entirely. |

## 2. Vendor & Driver Connection

CONNECTED end-to-end, single source of truth. Full detail:

| Hop | Status | Evidence |
|---|---|---|
| Vendor scoping | CONNECTED | `lib/vendor-mobile/access.ts` derives `vendorId` from `requestUser(request).id → prisma.vendor.findFirst({userId})` — never client-supplied for the `VENDOR` role. |
| New booking → correct vendor | CONNECTED | `BookingAvailabilityService` assigns/validates vendor at booking time. |
| Vendor sees booking | CONNECTED | `app/api/vendors/bookings/route.ts` gates by session-derived `vendorId`. |
| Vendor confirms vehicle/driver | CONNECTED | `lib/vendor-mobile/write.ts` (`assignment` section) enforces `booking.vendorId === a.vendorId` and vehicle/driver ownership before assignment. |
| Reservation conflict checks | CONNECTED | Same `findBookingConflict` reused by vendor assignment, admin assign-driver route, and vendor's own future-booking check — one centralized engine. |
| Admin Dashboard | CONNECTED | Reads `prisma.booking` directly — same table, no mirrored store. |
| Driver sees assignment | CONNECTED | `lib/driver-mobile/access.ts`/`read.ts` — session-derived `driverId` only. |
| Trip transitions (Arrived/Start/Complete) | CONNECTED | `lib/services/booking/DriverTripService.ts` enforces ownership, valid state machine, optimistic concurrency (`Serializable` isolation), and writes status history + audit log + notifications atomically. |
| GPS recording | CONNECTED | `DriverTripService.ts` `recordDriverLocation`: range-validated coords, trip/driver ownership re-verified, body-supplied ids cross-checked against session (403 on mismatch), rate-limited, audited. No unauthenticated/unscoped GPS write path found. |
| **`app/api/customers/bookings/route.ts`** | **RISKY → FIXED** | Adjacent to this chain's "customer sees status" hop. Had **no authentication** — `customerId` read from a raw `?id=` query param, returning full booking + vendor + driver + vehicle PII to anyone. **Fixed this session**: now requires auth and derives `customerId` from the session (privileged roles may still pass `?id=` explicitly, matching the existing vendor-mobile admin-override pattern). |

## 3. Corporate: Policy → Approval → Booking → Billing

CONNECTED. Detail:

| Hop | Status | Evidence |
|---|---|---|
| Policy evaluation | CONNECTED | `lib/services/corporate/CorporateTravelPolicyService.ts` (`decideTravelPolicy`), server-side, evaluated at quote time and again at submission. |
| Approval blocking | CONNECTED | `CorporateApprovalRequest`/`CorporateApprovalStep` (Prisma), no PENDING booking created pre-approval — no vendor-assignment bypass. |
| Approve → fresh re-quote → booking | CONNECTED | `lib/corporate-employee-mobile/write.ts` reloads the approval snapshot and re-derives pricing before booking. |
| Central booking table | CONNECTED, no shadow booking | `Booking.corporateId` is a plain FK on the same central `Booking` table (migration `20260906000002_add_corporate_booking_link`); `write.ts` imports `commitMarketplaceBooking` — the same function the website/customer app uses. |
| Corporate credit ledger | CONNECTED | `MarketplaceBookingService.ts` calls `chargeCorporateCredit(tx, …)` inside the same transaction as booking commit — not stubbed. |
| Corporate Admin Portal | CONNECTED | `lib/corporate-admin/{access,read,write,selects,route}.ts` (1,137 lines) + 19 page routes under `app/corporate-admin/*`, committed as of `ea6bd67`, clean git status. Auth scoped to `CORPORATE_ADMIN` role + own-company enforcement. Serves 18 sections including bookings, employees, policy, budgets, billing, reports. |
| Migration `20260925000000_corporate_approval_request_snapshot` | **Verified applied.** | `npx prisma migrate status` → "Database schema is up to date!" — the concern raised mid-audit (migration possibly unapplied) is resolved, not a blocker. |

**Correction to prior documentation:** `STAGE4-ADMIN-REPORT.md` (moved to `docs/launch-history/`) states the Corporate Admin Portal "has not been implemented." That was accurate when written, but a later commit (`ea6bd67`) completed it. The file now carries a stale-content notice; do not use it as current status.

## 4. Super Admin Dashboard, Notifications, Reports/Analytics

| Area | Status | Evidence |
|---|---|---|
| Dashboard command center | CONNECTED | `app/api/admin/dashboard/route.ts` — real `booking.groupBy`, `customer/vendor/driver/vehicle.count` queries, `requireAdmin` gate, honest empty states, no mock data. |
| Per-domain admin pages (finance/pricing/security/support/notifications/reports/analytics/corporate/vendors/drivers/customers) | CONNECTED | Each is its own top-level route; architecture is many focused pages, not one monolith. Grep for `mock|dummy|fake|Math.random|lorem ipsum` across all of them returned zero hits. |
| **`/api/analytics/route.ts`** | **RISKY → FIXED** | Had **no authentication check at all**, and `middleware.ts` doesn't cover it either — finance/corporate/marketplace analytics exposed to unauthenticated callers. **Fixed this session**: now requires auth + `Permission.REPORT_VIEW` (same gate as `/api/reports`), blocking `CORPORATE_ADMIN` from this global endpoint (matching the reports route's existing pattern). |
| `/api/reports/route.ts` | CONNECTED | Already correctly authenticated; delegates to `ReportsService` → `reportsRepository` (real Prisma queries). |
| Reports/Analytics data | CONNECTED | No hardcoded/placeholder metrics found in any report/analytics service or page. |
| Notifications — event coverage | CONNECTED (all event categories wired) | Booking created/changed, assignment, driver status/trip progress, corporate approval + decision, payment/billing, document expiry all have at least one notification-writing call site. |
| Notifications — architecture | **PARTIAL/DUPLICATED (not fixed — flagged only)** | Three divergent notification-writing paths coexist: (1) `lib/services/notification/NotificationService.ts`, used only by the manual admin-create endpoint; (2) direct `tx.notification.create(...)` calls inline in business transactions (driver assignment, trip status, corporate approval); (3) `lib/events/event-dispatcher.ts` (`dispatchRideGridEvent`), which *always* also writes a generic "Event X was processed successfully" notification. Confirmed double-write: `lib/corporate-employee-mobile/write.ts` calls both (1)-style inline create *and* `dispatchRideGridEvent` for the same booking-created event and the same user — the user gets two push notifications, one of them generic/confusing. **Not fixed this session** — `event-dispatcher.ts` is shared by 6+ call sites (marketplace cash-booking, payments verify/webhook, corporate employee, smart-return, website-seo automation); changing its default notification behavior needs its own review pass, not a same-session patch. Recommended fix: add an opt-out flag to `dispatchRideGridEvent`/`createRideGridEvent` for callers that already send their own notification. |

## 5. Website + SEO Engine

CONNECTED, fully wired, no shadow path (page-inventory generation intentionally out of scope per the task brief):

- Public catch-all `app/[...websitePath]/route.ts` → `legacyMigrationRepository.resolve()` → `publishedPageResponse()` (`lib/website-seo/publishing/public`) → `legacyFallbackResponse`.
- Backed by DB repositories (`WebsitePageRepository`, `WebsiteTemplateRepository`, `WebsiteEntityRepository`, `WebsiteKeywordRepository`) matching all six website-seo migrations.
- `app/sitemap.xml/route.ts` pulls real entries via `publishingIndexingEngine.sitemapEntries()`.
- `app/robots.ts` correctly blocks internal surfaces (`/admin`, `/api/`, `/corporate`) and points to the real sitemap.
- Admin UI (`app/website-seo/website/{pages,templates,publishing}`) is the only direct consumer of `WebsitePageRepository` — correct, since the public path goes through the publishing service layer instead.

## 6. Repository Cleanup

See `FINAL-INTEGRATION-REPORT.md` §15/16 for the full classification table and what was moved to `C:\Users\Wellcabs\Desktop\RideGrid\ridegrid-quarantine-20260925\`.

## Genuine Launch Blockers (as of this audit)

1. ~~`/api/analytics/route.ts` unauthenticated~~ — **fixed this session.**
2. ~~`/api/customers/bookings/route.ts` unauthenticated, PII exposure~~ — **fixed this session.**
3. ~~`app/api/bookings/create/route.ts` duplicate booking/pricing path reachable by any authenticated user~~ — **fixed this session (restricted to internal staff).**
4. Notification double-dispatch in the corporate booking flow — **not fixed**, low severity (UX noise, not data risk), needs a dedicated pass across `event-dispatcher.ts`'s 6 call sites.
5. `RIDEGRID-CLEANUP-ARCHIVE-2026-08-30/` (~55 files) and `backups/ridegrid-20260818-192315.dump` show as git-deleted but were already removed from disk by a prior, uncommitted session action — **decision needed**: commit the deletion (content is already gone either way) or restore from git history if the content is still wanted. Not touched this session pending that decision.
6. `apps/vendor-mobile/android/` — a native Android project folder (has its own `.gitignore` for `node_modules/.expo/dist`) sitting untracked in git. Uncertain whether this is intentional (bare-workflow native customization, needed for EAS/local builds) or leftover `expo prebuild` output. **Not touched** — flagged as uncertain (category I), needs a human decision on whether it belongs in version control.

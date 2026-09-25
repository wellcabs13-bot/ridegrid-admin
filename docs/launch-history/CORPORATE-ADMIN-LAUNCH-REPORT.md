# RideGrid Corporate Employee App: Launch Report

Stage 3 of the RideGrid Final Launch Execution Roadmap v1.0. Date: 2026-09-25. Branch: `phase-4-customer-module`. Nothing has been committed.

This report records the results of the implementation and verification run. Nothing was re-run to produce it.

## Before deploying

Apply the additive migration `prisma/migrations/20260925000000_corporate_approval_request_snapshot`. It has not been applied to any database. Until it is applied, submitting and viewing approval requests will fail.

## 1. App path

`apps/corporate-employee-mobile/`

- Expo 55, Expo Router, TypeScript, TanStack Query, SecureStore.
- Versions match the Driver app.
- There are no runtime imports from the other mobile apps.
- The root `tsconfig.json` excludes the app, the same way it excludes the other mobile apps.

## 2. Screens implemented

- **Sign-in:** Login, Forgot password, Reset password.
- **Tabs:** Home, Book Ride, My Trips, Updates (notifications), Account.
- **Other screens:** Search results, Ride (fresh quote and policy decision), Approvals list, Approval detail, Trip detail, Travel Policy, Support, Not found.

Reusable components:

- **Frame and states:** screen frame, company header, offline banner, loading / error / empty states, confirmation sheet.
- **Badges:** policy, approval and status.
- **Cards:** marketplace listing, trip, approval, budget and notification.
- **Other:** fare breakdown, status timeline, and the date and select inputs.

## 3. Existing backend reused

- **Marketplace search and options.** The same services as the customer app: One-way, Roundtrip and Local. No airport or tours service was added.
- **Central quote service.** Pricing rate versions, pricing policies and pricing quotes, calculated with Decimal.
- **Availability.** Reservation windows and the exact vehicle and driver conflict checks.
- **Corporate services.** Corporate credit, travel policy, and approval workflow and rules. The policy and approval services were extended, not rebuilt.
- **Notifications, event dispatch, and auth** (`/api/auth/*`).
- **Support contacts:** the existing `WELLCABS` configuration.

## 4. Thin APIs added

**`/api/mobile/corporate/[section]`** (`lib/corporate-employee-mobile/`)

- Reads: home, profile, policy, budget, config, search, trips, trip-status, approvals, notifications.
- Writes: quote, book, approvals (submit or cancel), notifications (mark read).

**`/api/corporate/approval-requests`** (approver list and decision)

- Super Admin and Operations can decide for any company.
- A Corporate Admin can decide only for their own company.

## 5. Policy integration

The server decides ALLOWED, APPROVAL_REQUIRED or NOT_ALLOWED. The app only displays the result.

The decision is made at three points:

1. On every search result. This is a preview.
2. On the fresh quote. This is the authoritative decision.
3. Again at booking and at approval submission.

The rules:

- **NOT_ALLOWED (cannot be approved around):**
  - outstation travel when the policy disallows it;
  - airport travel when disallowed;
  - booking with less than the policy's minimum notice.
- **APPROVAL_REQUIRED:**
  - trip over the amount limit;
  - vehicle category not allowed;
  - night travel (10 PM to 6 AM, India time);
  - employee monthly or yearly limit exceeded;
  - company requires approval for every trip.
- **Night-travel fix:** the existing night-travel check used the server's clock. It now uses India time.

## 6. Approval workflow integration

**Why approval comes before booking.** A ride awaiting approval is not stored as a PENDING booking, because a vendor can assign a driver to a PENDING booking and skip approval.

**How requests are stored.** The existing `CorporateApprovalRequest` and `CorporateApprovalStep` records are used. The requested ride is stored in the new `requestSnapshot` column.

**Steps and notifications.**

- Steps come from the company's existing approval rules.
- With no rules configured, a single corporate-admin decision is required. No approver is invented.
- Each decision updates the lowest pending step.
- A rejection needs a reason.
- The employee is notified at the final decision.

**Booking an approved ride.**

- It needs a fresh quote for the same package, vehicle and pickup time.
- The fresh fare must not exceed the approved amount.
- The approval is bound to exactly one booking inside the booking transaction.

**Statuses the employee sees.** PENDING, APPROVED, BOOKED, REJECTED, CANCELLED and EXPIRED. EXPIRED is shown when the pickup time passes.

**Admin portal.** The admin Corporate page has a new "Approval requests" tab (`components/admin/CorporateApprovalRequests.tsx`).

## 7. Booking and marketplace integration

**Same Booking table.** Rides are saved in the same `Booking` table with `bookingSource = CORPORATE` and the company attached. The employee is linked through their own Customer profile, created on their first booking.

**Shared booking code.** The website/customer `cash-booking` route's booking transaction was moved into the shared `lib/services/booking/MarketplaceBookingService.ts`. Both the website and this app now use it.

- The move was mechanical.
- `cash-booking` has no tests of its own; only the root type-check and the production build cover the refactor.
- Run one real website checkout on staging.

**Retries.** Booking and approval submission are idempotent per quote, so an interrupted request can be retried safely.

**Shared location helper.** The trusted driver-location check was moved into `lib/services/booking/TrustedLocationService.ts`. The customer trip-status route now uses it too.

## 8. Corporate ownership security

**Identity comes from the session.**

- Company and employee identity come only from the signed-in session.
- A request that sends a different `corporateId`, `companyId`, `employeeId`, `userId` or `customerId` is rejected with 403.
- Only the CORPORATE_EMPLOYEE role is accepted, and inactive employees or companies are rejected.

**Everything is scoped to the employee.**

- Trips: the employee's own bookings for their company.
- Approvals: the employee's own requests.
- Notifications: the employee's own.

**Responses hide internal data.**

- Fares omit vendor payout, processing cost and RideGrid revenue.
- The driver's phone number is shown only while a driver is assigned or the trip is in progress.
- Vendor and driver phone numbers are removed from search results.

**Existing corporate endpoints tightened:**

| Endpoint | Before | After |
|---|---|---|
| `approvals` | No authentication | Super admin only |
| `travel-policy` | No authentication | Super admin only |
| `budgets` | Any signed-in user could read or create any company's budget | Super admin only |
| `credit-account` | Anyone | RideGrid staff and active members of that company |

The website's corporate checkout calls `credit-account`, so test that path on staging.

## 9. Notifications

**Reading them.** The app lists notifications, shows the unread count as a tab badge, and marks them read in place.

**New notifications sent when:**

- an approval is requested (to the employee and the company's corporate admins);
- a request reaches its final decision (to the employee);
- a ride is booked (to the employee).

**No deep links.** Notifications carry no booking or request IDs, so they are not deep-linked to a screen.

## 10. Budget visibility status

- **What the employee sees:** their own monthly and yearly travel limits, each with limit, used, remaining and period.
- **When it appears:** only when the company has set those limits.
- **How "used" is counted:** the employee's booked, non-cancelled company rides by pickup date, India time.
- **What stays hidden:** company-level budgets (`CorporateBudget`) stay admin-only.

## 11. Payment and billing behavior

- **Corporate credit:** used when the company has a credit account set up with a limit above zero.
- **Otherwise:** the existing cash-at-pickup behavior applies.
- **Shown in advance:** the app tells the employee which one applies before they confirm.
- **Not added:** no card, wallet or online checkout.

## 12. Tests passed

- **New backend tests:** `tests/unit/corporate-employee-mobile-api.test.ts`, 25 tests, all passing. They cover role restriction, identity forgery, cross-employee and cross-company denial, policy decisions, approval enforcement, the approver's company limit, multi-step approvals, and safe response data.
- **App tests:** 7 tests, all passing. They cover session restoration, offline safety, booking payloads carrying no identity, approval amount and time binding, and India-time handling.
- **Root unit tests:** 225 of 225 passed.
- **Existing test fixed:** a mock in the customer trip-status test was out of date (`tests/unit/customer-mobile-premium.test.ts`).

## 13. Expo Doctor result

- `npx expo-doctor`: 20 of 20 checks passed.
- `npx expo install --check`: dependencies are up to date.

## 14. Android, iOS and web export result

`npm run export` built all three bundles:

| Platform | Modules | Bundle size |
|---|---|---|
| Web | 937 | 1.8 MB |
| iOS | 1,214 | 3.3 MB |
| Android | 1,235 | 3.4 MB |

**Visual smoke test** (mocked API data at 320px and 390px):

- 32 screenshots.
- No horizontal overflow and no page errors.
- A within-policy booking and an approval submission both completed.
- Screenshots are in `apps/corporate-employee-mobile/verification/`.

## 15. Root and backend regression result

- **Root type-check:** clean.
- **Root production build** (`npm run build`): succeeded.
- **Encoding guard:** passed.
- **Full root test suite:** 658 of 659 passed.
  - The one failure is the website-SEO check "keeps unverified business details explicit and unclaimed".
  - It was already failing before this work and is unrelated to it.
- **Other mobile apps:**

| App | Tests |
|---|---|
| customer-mobile | 11 of 11 passed |
| vendor-mobile | 4 of 4 passed |
| driver-mobile | 4 of 4 passed |

## 16. Schema and migration changes

**What:** one additive migration, `20260925000000_corporate_approval_request_snapshot`. It adds a nullable `requestSnapshot` JSON column to `CorporateApprovalRequest`.

**Why it was needed.** The approval request had no field to hold the ride an approver decides on: package, pickup time, addresses and quoted fare. Creating a PENDING booking instead would have let a vendor bypass approval.

**What was not changed:** no historical migration was edited.

**Status:** not applied to any database.

## 17. Genuine limitations

- **No hold during approval.** The vehicle isn't reserved while approval is pending; availability and price are rechecked when the employee books.
- **Approvers use the portal.** Employees who are approvers can't decide requests in this app. Decisions are made in the admin portal or through the approval-requests API.
- **Corporate Admin login.** Corporate Admin users are supported by the API, but the existing admin Corporate page is limited to super admins.
- **Read-only profile.** No employee self-edit API exists.
- **No push registration.** Notifications are in-app only.
- **Deep links.** Notifications can't deep-link, because they carry no structured identifiers.

## 18. Remaining device and staging validation

1. Apply the migration.
2. Run end to end with real employee, corporate admin, vendor and driver accounts:
   - book a within-policy ride and confirm it shows for the admin, vendor and driver;
   - submit a ride that needs approval, approve or reject it, then book the approved ride.
3. Book once with corporate credit and once with cash at pickup.
4. Run one website checkout, to cover the shared booking code and the `credit-account` change.
5. Build with EAS and test on real Android and iOS devices, including the native date picker.
6. Confirm live driver location while the Driver App is sharing it.

## Working-tree note

`git status` also shows changes made before this session. Leave them out of this change's commit:

- corporate `dashboard`, `profile` and `route.ts`;
- the untracked driver services `DriverNotification.ts` and `DriverTripService.ts`;
- other files in the untracked `components/admin/` folder.

This work added two files in that folder: `CorporateApprovalRequests.tsx` (new) and an edit to `CorporateOperations.tsx`.

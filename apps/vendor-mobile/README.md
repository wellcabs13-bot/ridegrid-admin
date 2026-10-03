# RideGrid Vendor Mobile

Expo 55 / React Native / TypeScript / Expo Router client for the existing RideGrid backend. No database connection or pricing calculation runs on the device.

## Run

```powershell
cd apps/vendor-mobile
npm ci
Copy-Item .env.example .env
# Set EXPO_PUBLIC_API_BASE_URL to the existing RideGrid HTTPS origin.
npm start
```

`EXPO_PUBLIC_API_BASE_URL` is the only required mobile environment value. It must be an origin, without `/api`. Production requires HTTPS. Local HTTP is accepted only in development; physical devices need a reachable LAN origin rather than localhost. The backend retains its existing database, authentication and email configuration. No server secrets belong in Expo variables.

Native authentication uses `expo-secure-store`, under `ridegrid.vendor.session`. Browser preview intentionally cannot persist credentials. The visual QA script substitutes storage only inside its isolated browser runtime and intercepts every API call with clearly identified fixtures.

## Screens

Home, booking/trip filters, booking detail and history, fleet list/detail/add/edit/status, driver list/detail/add/edit/status, vehicle-driver alignment, booking assignment confirmation, date availability, Local/One-way/Roundtrip rates, notification inbox/read state, profile/address/security, document upload/status/expiry, earnings/settlement history, configured operations support, login, forgot password and reset password.

Driver onboarding requires an owned vehicle without a driver. A securely randomized password hash is created through the existing password service. The driver activates access through existing email password recovery; the vendor never receives a password. Shared drivers are readable through owned vehicles, but edits require exclusive current association. Suspensions, verification and protected fleet statuses remain Operations decisions.

## Existing backend integration

| Capability | Source of truth / behavior |
| --- | --- |
| Authentication | `/api/auth/login`, `/refresh`, `/me`, `/logout`, `/forgot-password`, `/reset-password`; current database role checked by `requestUser` |
| Booking and trip state | Existing Booking, Trip, BookingStatusHistory; no accept/reject or trip-state simulation |
| Assignment | Exact booked vehicle and aligned driver, eligibility and ownership checks, shared reservation-conflict service, serializable transaction and audit/history |
| Availability | `BookingAvailabilityService`; Asia/Kolkata calendar windows; shared blocking statuses and strict overlap comparisons |
| Rates | `/api/pricing/manage?view=simple` and `simple-rates`; existing `saveSimpleRates`, version checks, approval workflow and audit; no GST/platform-fee mutation |
| Fleet/drivers | Existing Vehicle, Driver and User records; driver ownership follows existing vehicle relationships |
| Notifications | Existing per-user Notification rows and readAt; 30-row pagination |
| Financials | Existing VendorWallet, VendorSettlement and recorded completed-booking vendorEarning; unknown amounts remain “Not recorded” |
| Documents | Existing dedicated VehicleDocument, DriverDocument and VendorDocument plus existing `storeFile`; uploaded files always PENDING |
| Support | Existing `WELLCABS` configuration returned by the backend |

The thin adapters live under `/api/mobile/vendor/{home,bookings,fleet,drivers,assignment,availability,profile,notifications,earnings,config,documents}`. Reads use explicit projections and all vendor identity comes from authentication. No schema changes or migrations were introduced.

Legacy vendor reads were hardened to derive vendor identity. Administrative fleet/driver CRUD and generic document handlers now require their appropriate central roles; vendors use scoped adapters. Document downloads enforce ownership. Existing unauthenticated access to these protected resources is intentionally removed.

## Connectivity and data

TanStack Query provides cancellation, refresh, memory caching and pagination. Home/bookings refresh periodically while active. Mutations are never queued for later offline execution and report success only after the server responds. On-device list snapshots last 24 hours and contain only booking references/status/time, fleet display fields, and driver IDs/status. Names, contact details, addresses, rates, banking, documents and credentials are excluded. Snapshots are separated by account and cleared on account change/logout.

## Capability boundaries

- No vehicle image field exists in the audited Vehicle schema; no placeholder image is represented as a real vehicle photo.
- Notifications have no structured entity reference; inbox/read behavior is supported, inferred deep links are not fabricated. Push-token registration is not implemented in the existing platform.
- Tours are unavailable in the existing pricing catalog.
- Customer contact, raw quote JSON and payment credentials are not exposed by the new booking DTO. The app shows recorded vendor earnings and payment method/status; it does not infer a vendor payout from the customer's total.
- Settlements are read-only Finance records. No payout or bank-account mutation is offered.
- No existing special-request field was found on Booking; none is invented.
- Existing unresolved bookings block changes to fleet eligibility or driver alignment. Operations handles booking reassignment; the vendor may confirm the exact existing pair.

## Verification

See `LAUNCH-REPORT.md` for results and remaining release validation. Commands:

```powershell
npm run typecheck
npm test
npx expo install --check
npx expo-doctor
npx expo export --platform all
```

From the repository root, run the vendor API/document/session tests plus the existing pricing, reservation-window and customer-mobile regressions. `scripts/visual-smoke.cjs` runs against an Expo development preview on port 8097 with a development API origin of `http://localhost:3001`; traffic is intercepted and no real accounts or database records are changed.

The `eas.json` profiles are prepared for development, internal Android APK and production builds. Signed device/store builds require the deployment owner's EAS project and Apple/Google signing credentials. Bundle export is not a signed app or a device acceptance test.

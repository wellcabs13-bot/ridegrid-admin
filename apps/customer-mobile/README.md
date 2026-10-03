# RideGrid Customer Mobile

An isolated Expo SDK 55 / React Native / TypeScript / Expo Router client of the existing RideGrid Next.js backend. The app does not contain Prisma, backend secrets, pricing calculations, a separate booking service, or a payment engine.

## Run

Use Node 22.13+ (verified here with Node 24) and npm. Run the existing backend separately with its existing environment.

```powershell
cd apps/customer-mobile
npm ci
Copy-Item .env.example .env.local
# Set EXPO_PUBLIC_API_BASE_URL to the existing backend origin, without /api.
npm start
# Native development builds:
npm run android
# On macOS with Xcode:
npm run ios
```

`EXPO_PUBLIC_API_BASE_URL` is the only required mobile environment variable. It is public and must contain no credentials. Production requires HTTPS. Development allows HTTP: Android emulator normally uses `http://10.0.2.2:3000`; an iOS simulator can use `http://localhost:3000`; physical devices use a reachable LAN hostname/IP. The API host must be reachable from the device. Device transport-security settings may require an HTTPS development tunnel. Never disable production TLS checks.

The app uses native SecureStore; the web bundle is a layout/read-only preview and intentionally does not persist or enable customer sign-in without secure storage. Native network requests use bearer tokens and do not depend on browser cookies or CORS.

`eas.json` supplies development, internal preview and production profiles. Link the project to your Expo account, confirm the application identifiers in `app.json`, configure the production API URL in the build environment, and supply Apple/Google signing credentials before producing store binaries. `expo-dev-client` is included. Do not assume an arbitrary Expo Go version matches SDK 55.

## Structure

- `app/`: five native tabs and stack routes for authentication, search, listing, checkout, confirmation/booking detail, profile, security and support.
- `src/features/`: auth, marketplace, bookings and push preparation.
- `src/services/`: centralized bearer API client, shared token refresh, request timeout/cancellation and customer-safe error normalization.
- `src/state/`: TanStack Query, network/focus integration, secure session lifecycle and in-memory booking draft.
- `src/storage/`: SecureStore sessions; 24-hour AsyncStorage cache of public marketplace options only.
- `src/components/`: design tokens, accessible forms, searchable city/package selectors, native date/time pickers, pricing breakdown and reusable states.
- `src/types/`: mobile-safe API contracts with no cross-project runtime imports.
- `tests/`: client business-boundary tests. Additional adapter/session tests are in the repository's `tests/unit/customer-mobile-*.test.ts`.
- `assets/icon.png`: rasterized from the existing website `public/favicon.svg`; the red/ink interface follows the public Wellcabs shell.

## Server integrations

| Capability | Existing endpoint / adapter |
| --- | --- |
| Login, session, refresh, logout | `/api/auth/login`, `/me`, `/refresh`, `/logout` |
| Registration | `POST /api/customers` using existing customer creation and password rules |
| Password reset | `/api/auth/forgot-password`, `/api/auth/reset-password` |
| Live services, cities, packages | `/api/marketplace/options` |
| Search, pagination, category filter | `/api/marketplace/search` |
| Exact-address suggestions | `/api/marketplace/location-search` through the existing server provider |
| Immutable quote | `POST /api/pricing/quote` |
| Cash confirmation | `POST /api/marketplace/cash-booking` |
| Own profile / name editing | `GET/PATCH /api/mobile/profile` |
| Own paginated bookings / details | `GET /api/mobile/bookings?page=...` or `?id=...` |
| Own inbox / unread count / read state | `GET/PATCH /api/mobile/notifications` |
| Capability and existing support/legal configuration | `GET /api/mobile/config` |

The mobile adapters authenticate current active users, require CUSTOMER role, scope reads/writes to their user ID, use explicit field selections, and reject cross-site browser mutations. They add no database tables or migrations. The cash-booking route now binds a signed-in customer's booking to their own customer record, instead of looking up another account by entered contact information. Existing guest/operator paths remain in place.

## Journey and recovery

Roundtrip dates are counted inclusively once, using calendar fields: 24 Sep through 27 Sep is four days. The website's noon India-time default is used for roundtrips. `days`, route, category, package and exact pickup timestamp are preserved into the quote and booking request. The server remains authoritative for fare, quote expiration, reservations, conflict checks, taxes and payment state. Expired or mismatched quotes cannot be submitted by the app. A fresh price requires terms acceptance again.

The in-memory draft contains no fabricated booking. A disabled submit button and a synchronous guard prevent double taps. Interrupted submissions direct customers to My Trips; a retry uses the same quote ID rather than generating a second booking. Mutations are not queued offline. No gateway callback can set payment status; `payment-return` only directs the customer to server booking records.

Session rotation is single-flight. An invalid refresh clears local credentials and private query data. Network failures preserve credentials for recovery. Session generations prevent a late refresh from restoring a logged-out account. Logout revokes the stored refresh token directly and clears SecureStore and private caches after the server succeeds.

Offline public options are retained for 24 hours. Previously loaded private queries can be viewed in memory during the same signed-in session, with an offline indicator. No profile, address, booking, payment data or tokens are written to AsyncStorage. Account switching clears private data.

## Capabilities deliberately unavailable

- **Online marketplace checkout:** the current website explicitly disables it and the cash endpoint accepts only cash or corporate credit. Existing Razorpay order/verification routes are not a complete new-marketplace checkout flow. The customer app exposes cash only and never invents an online booking flow.
- **Wallet:** the existing wallet is vendor-owned; there is no customer money ledger. No fabricated balance, top-up, refund or wallet-payment action is shown.
- **Cancellation:** CUSTOMER lacks `BOOKING_CANCEL`. The app offers support instead of bypassing RBAC or inventing refund rules.
- **Push:** no device-token persistence/delivery lifecycle exists. Permission/token registration is prepared behind a capability gate in `src/features/notifications/push.ts`; it is not activated. The current notification schema also lacks a booking/action identifier, so inbox messages are not guessed into booking links.
- **Verification:** the standalone OTP endpoints do not complete customer account verification or deliver an OTP in production. No simulated verified state is shown.
- **Reset delivery:** the current forgot-password route creates a token but does not send the raw token by email/SMS. The app implements request/reset screens, but actual reset-link delivery requires backend completion. The app does not claim that a link was delivered.
- **Contact changes / password change:** name editing is available; authenticated email/mobile-change and change-password flows are not established customer APIs. Support and the existing reset flow are exposed instead.
- **Tours, live GPS, preferences, special requests, loyalty/referrals, reviews:** not added where the current marketplace/customer APIs do not support a complete customer workflow. Local, one-way and multi-city roundtrip match the current public marketplace.

Legal links point to existing website content, which itself has pending business/legal review notices. This implementation does not approve those notices for publication.

## Links

- `ridegrid://reset-password?token=...`
- `ridegrid://bookings/<booking-id>` (authenticated ownership checked on the server)
- `ridegrid://payment-return` (always re-read server state)

Existing website reset URLs continue to work. HTTPS universal/app links require the real production domain and its association files; those are not invented here.

## Verification

```powershell
npm run typecheck
npm test
npm run config:check
npx expo install --check
npx expo-doctor
npm run export
# Repository root:
npx vitest run tests/unit/customer-mobile-api.test.ts tests/unit/customer-mobile-session.test.ts tests/unit/booking-availability.test.ts tests/unit/pricing-workflow.test.ts tests/unit/pricing-engine.test.ts
npm run build
```

The root TypeScript configuration excludes `apps/customer-mobile` so the Next build does not typecheck native modules. Root dependencies, pricing engine, schema and historical migrations were not changed by this task.

`scripts/preview-smoke.cjs` uses the repository's Playwright installation and real GET responses, with the existing backend on port 3001 and Expo web preview on 8091 (`EXPO_PUBLIC_API_BASE_URL=http://localhost:3001`). It only adjusts browser CORS for read-only native-UI QA; it never inserts fixtures, creates accounts, or submits bookings/payments. See `IMPLEMENTATION-REPORT.md` for verified results and remaining device/release validation.

Expo version compatibility follows the [official SDK 55 documentation](https://docs.expo.dev/versions/v55.0.0/).

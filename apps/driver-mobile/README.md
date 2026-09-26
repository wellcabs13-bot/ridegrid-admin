# RideGrid Driver

Expo / React Native / TypeScript operational frontend for the existing RideGrid backend. No separate database, booking engine, pricing calculations, or cross-app runtime imports.

## Run

```powershell
cd apps/driver-mobile
npm ci
# Set the actual deployed backend URL before building:
$env:EXPO_PUBLIC_API_BASE_URL="https://your-ridegrid-backend.example"
npm start
```

Production transport requires HTTPS. HTTP is allowed only in development. Use an existing active DRIVER user linked to an active Driver profile. Password recovery uses the existing backend email flow. Native SecureStore is required for real sign-in; web is a visual preview, with no browser credential-storage fallback.

```powershell
npm run typecheck
npm test
npx expo install --check
npx expo-doctor
npm run export
```

`eas.json` includes development, internal APK preview and production profiles. EAS project/account association, Android/iOS signing and store submissions are separate release steps. Export creates JS/Hermes bundles; it does not create a signed APK/IPA.

## Operational contract

- Trips are assigned Bookings from the existing database. ARRIVED records `Trip.ARRIVED_AT_PICKUP` while Booking remains `DRIVER_ASSIGNED`; START records `Trip.STARTED` and `Booking.TRIP_STARTED`; COMPLETE records `Trip.COMPLETED` and `Booking.TRIP_COMPLETED`.
- Every transition goes through `lib/services/booking/DriverTripService.ts`, checks current ownership/state, and commits history, audit and notification rows atomically. No optimistic critical mutations or offline mutation queue.
- Foreground GPS requires explicit permission and one eligible arrived/started trip. It uploads about every 30 seconds while the app is active and online, pauses in the background, and stops on logout/completion. The backend independently validates every update, fixes its source and timestamp, and rate limits to one update per 10 seconds.
- Customer tracking requires a matching `TrustedDriverLocation` audit row and a location younger than two minutes. Historical unauthenticated coordinates are never promoted. Authentication establishes the reporting account; it is not hardware attestation of physical coordinates.
- Assignment, booking-change, cancellation and trip-operation notifications use existing Notification records. The inbox polls while foregrounded. Device push registration/delivery and scheduled pickup reminders are not implemented.
- Profile, document status/expiry, masked licence, vehicles, completed-trip allocations, payroll and incentives are read-only. Driver document submission and profile changes remain with Vendor/Operations because current central permissions do not authorize driver self-service writes. No raw Aadhaar values or document file URLs are returned.
- Safety opens configured support calls/email/WhatsApp and native sharing. Optional backend `DRIVER_EMERGENCY_PHONE` supplies an emergency call target. No monitored emergency-response promise; the legacy unauthenticated SOS-write endpoint is disabled behind driver authentication.
- Persistent offline cache stores only trip ID, number, status, pickup time and trip type, expires after 24 hours, and is removed on account change/logout. Customer contacts, documents, GPS and financial data are never persisted there. Existing in-memory route display remains available while mounted; persisted full route/address caching is deliberately omitted.

## Verification

See `LAUNCH-REPORT.md`. `scripts/visual-smoke.cjs` uses isolated browser fixtures and intercepts all API requests. It never logs in to production, creates a real trip or writes to the database. Fixture tokens are injected only by the external QA script, not by shipped application code.

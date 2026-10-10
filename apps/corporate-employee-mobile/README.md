# RideGrid Corporate Employee app

Expo Router app for `CORPORATE_EMPLOYEE` accounts. It books on the central RideGrid marketplace; it has no booking, pricing or approval logic of its own.

## Setup

```
cp .env.example .env        # set EXPO_PUBLIC_API_BASE_URL (https only outside dev)
npm install
npm start
```

## Backend it uses

- `/api/mobile/corporate/[section]`: employee adapter (`lib/corporate-employee-mobile`). Company and employee identity always come from the session; request-supplied `corporateId`/`employeeId`/`userId` values that differ are rejected.
- `/api/marketplace/options`: public marketplace routes (One-way, Roundtrip, Local).
- `/api/auth/*`: login, refresh, logout, forgot/reset password.
- Approvers decide requests via `/api/corporate/approval-requests` (Super Admin/Operations for any company, Corporate Admin for their own company) and in the admin Corporate page under "Approval requests".

## Flow

Search → server policy preview per listing → fresh quote with authoritative policy decision →
- **Allowed**: book (same `Booking` table, `bookingSource=CORPORATE`, corporate credit when configured, else cash at pickup).
- **Approval required**: submit request → approver decides → employee books with a fresh quote that must not exceed the approved amount.
- **Not allowed**: no booking or request action.

Booking and approval submission are idempotent per quote, so an interrupted request can be retried safely.

## Checks

```
npm run typecheck && npm test
npx expo install --check && npx expo-doctor
npm run export
node scripts/visual-smoke.cjs   # needs `EXPO_PUBLIC_API_BASE_URL=http://localhost:3002 npx expo start --web --port 8099`
```

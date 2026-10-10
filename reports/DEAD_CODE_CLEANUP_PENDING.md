# Dead mock-data code — pending owner approval (nothing deleted)

Verified 2026-10-10: no file under app/, lib/, hooks/, contexts/, services/, tests/ or e2e/ imports these (live pages /reports, /support, /notifications use real APIs via components/admin/*). They render hardcoded fake KPIs/tickets.

## Directories (all files orphaned)
- components/reports/ (25 files)
- components/support/ (25 files)
- components/notifications/ (19 files)

## Data modules with no importers outside those directories
- data/analytics.ts
- data/bookings.ts
- data/customers.ts
- data/dashboard.ts
- data/finance.ts
- data/locations.ts
- data/notifications.ts
- data/reports.ts
- data/support.ts

(data/drivers.ts is still imported as a type by live driver pages — keep.)

## Suggested command (after approval; restorable from git)
    git rm -r components/reports components/support components/notifications data/{analytics,bookings,customers,dashboard,finance,locations,notifications,reports,support}.ts
    npx tsc --noEmit && npx vitest run && npx next build

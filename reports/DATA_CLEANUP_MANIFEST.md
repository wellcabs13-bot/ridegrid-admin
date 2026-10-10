# Production test-data cleanup manifest — NOTHING DELETED (awaiting owner scope confirmation)
Read-only inventory 2026-10-10 (emails masked). Production DB (Supabase ap-south-1).

## Non-empty tables
User 11, Customer 4, Vendor 1, Driver 3, Vehicle 3, Booking 3, BookingStatusHistory 12, Trip 2, VendorDocument 3, DocumentRecord 3, FileAsset 7,
Transaction 4, Corporate 1, CorporateBranch 2, CorporateDepartment 3, CorporateEmployee 5, CorporateTravelPolicy 1, CorporateWallet 1,
CorporateWalletTransaction 4, CorporateApprovalRequest 4, CorporateApprovalStep 4, PricingRule 3, PricingPackage 18, PricingRateVersion 18,
PricingPolicy 4, PricingQuote 15, Notification 44, NotificationLog 25, SupportTicket 1, CustomerSavedRoute 1, PushDevice 13, RefreshToken 203,
PasswordResetToken 19, RideGridEvent 14, AuditLog 265, SystemSetting 7, SchedulerJob 1, BookingSequence 1, WebsiteSeo* (entities 37, templates 6, pages 1, ...).

## Users (11)
| id | role | email | created | proposed |
|---|---|---|---|---|
| cms5iszvk0000d8ujdunkj82t | SUPER_ADMIN | a***@ridegrid.in | 2026-07-29 | **KEEP** (only admin) |
| cmupp0hgp0000l0043tqobxw8 | VENDOR | a***@gmail.com | 10-01 | test? OWNER TO CONFIRM |
| cmupp8wu0000al804dw9ljmc2 | DRIVER (Atharva) | a***@gmail.com | 10-01 | test? OWNER TO CONFIRM |
| cmus1ndwt0001jv04oa486q42 | DRIVER (Onkar) | o***@gmail.com | 10-03 | test? OWNER TO CONFIRM |
| cmuxp1j2o0007l306twidpc1i | DRIVER (AK) | a***@gmail.com | 10-07 | test? OWNER TO CONFIRM |
| cmurubgri0003jv04psifhk1p | CORPORATE_ADMIN | o***@gmail.com | 10-03 | test? OWNER TO CONFIRM |
| cmurve9ly0006jz043rdo7osc, cmurzs0kf0000ic04jg38iqb9, cmus0mpjp0000kx04e3rtx7ok | CORPORATE_EMPLOYEE x3 | gmail | 10-03 | test? OWNER TO CONFIRM |
| cmus0pq0a000di504y0quz45o, cmusc6d0c0001lb04a6p9qafg | CUSTOMER x2 | gmail | 10-03 | test? OWNER TO CONFIRM |
All 10 non-admin accounts were created 1–7 Oct 2026 (QA period) but I cannot prove none belongs to a real person. Do not delete until you confirm.

## Operational records
- Vendor 1 (cmupp0hhb0002l0048hjg7lo3), Vehicles 3 (hatchback cmupp3eqm0008l804pxe0rw57 verified; SUV cmus0xtn00007jx04goahinf6; sedan cmuxouv5g0001kz06p5icmi0u), Drivers 3, Customers 4.
- Bookings 3 (2 TRIP_COMPLETED, 1 CANCELLED) + 4 Transaction rows + 4 CorporateWalletTransaction rows = FINANCIAL RECORDS: recommend RETAIN until your accountant confirms they are test-only.
- Corporate 1 company (+2 branches, 3 departments, 5 employees, 1 wallet, 1 policy, 4 approvals).
- Pricing: 3 rules, 18 packages, 18 rate versions (9 approved), 4 policies (GST 5%, platform fee) = BUSINESS CONFIG. Keep policies; rate versions/packages are tied to the test vendor's vehicle.

## Always keep
SUPER_ADMIN user, AuditLog (265), SystemSetting, PricingPolicy (tax/fee), WebsiteSeo* content, locations/reference data, migrations.
Session/token noise (RefreshToken 203, PasswordResetToken 19, PushDevice 13, Notification 44, NotificationLog 25) can be purged safely once the owning users go.

## Proposed order (transaction, dependency-first) — to be turned into a script ONLY after you confirm scope
1. Dry run: for the confirmed user IDs, list every dependent row per table (Prisma dmmf FK walk) and review counts.
2. Delete children → parents: Notification*, PushDevice, RefreshToken, PasswordResetToken → BookingStatusHistory, Trip, Transaction, Booking →
   Corporate approvals/wallet tx/wallet/employees/departments/branches/policy/company → PricingQuote, PricingRateVersion, PricingPackage →
   DocumentRecord/VendorDocument/FileAsset → Vehicle → Driver → Vendor → Customer → User.
3. Single transaction, row-count assertions, abort on any unexpected count; verify Super Admin login and an empty-state dashboard.
4. Keep AuditLog rows (they reference users by id; check FK is not ON DELETE CASCADE before deleting any user — if it is, the audit history would vanish).
No full database backup is made by default; a pg_dump of only the affected tables is a cheap safeguard if you want one.

## Decisions I need
(a) Which of the 10 non-admin users are real people? (b) May the 3 bookings/4 transactions be deleted or must they stay? (c) Keep or delete the corporate demo company?

# Pricing audit — 18 September 2026

Inspected before implementation: `app/pricing/page.tsx`, all three existing
`app/api/pricing` routes, `PricingService`, `MarketplaceListingService`, marketplace
cash booking, booking creation, booking fare components, Smart Return eligibility
and marketplace routes, Prisma schema and migration history, permissions and audit.

Existing reusable data: PricingRule (vendor/category/type), PricingPackage
(vehicle/route/city/airport/package), Decimal money, DynamicPricingRule, Coupon,
VendorPromotion, CorporateContract, SmartReturnListing/ReturnApproval, AuditLog,
Booking monetary columns and pricingPackageId. Existing packages support local,
airport and outstation; existing TripType only has ONEWAY/ROUNDTRIP. Canonical
service names must be additive, not an incompatible enum replacement.

Gaps: no approved immutable rate versions, effective intervals, bands, quote
snapshot, configurable platform/tax policy or discount funding. PricingService
uses float arithmetic and a vehicle fallback; marketplace search displays only
baseFare and cash booking calculates independently. Pricing APIs authenticate but
do not enforce ownership. Package edits overwrite shared rule values. Audit is
not atomic with pricing writes. No focused pricing tests found. No spreadsheet
import pattern identified in the existing pricing tool.

Implementation boundary: keep existing rules/packages and historical bookings;
add version records and policies, central Decimal quotes, transactional audit,
and pricing-only integration fields. Existing legacy prices are not silently
approved. Finance must configure actual fees/taxes and vendors/admin must submit
and approve rates before marketplace quotes can be issued. No rates or tax
assumptions are seeded. Existing dirty working-tree changes are preserved.

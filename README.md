# Corporate Booking + Corporate Credit

Run after applying files:

npx prisma generate
npx tsc --noEmit
npx prisma migrate deploy

IMPORTANT: existing migration 20260906_booking_pricing_package currently fails because pricingPackageId already exists. Resolve that pre-existing migration safely before deploying this migration. Do not blindly mark it applied.

Corporate Credit uses existing CorporateWallet: balance = outstanding/used credit; effective limit = wallet.creditLimit or Corporate.creditLimit.

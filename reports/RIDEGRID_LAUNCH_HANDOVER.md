# Launch handover (plain language) — 2026-10-08
**Short answer: not ready to launch yet. Three things need you.**

## What is live right now
The website works (414 pages, all load). But it is slow, and the cab search returns no cars.

## Why no cars show up
Your approved prices were set for driver *Atharva*. On 7 Oct the hatchback was given to driver *AK*. The system only sells a price for the exact car + driver it was approved for, so all prices stopped matching and the car vanished. Fix (pick one, in Super Admin):
- Give the hatchback (MH12UW9492, Tata Altroz) back to Atharva — all 9 prices come back immediately; or
- Re-create and approve the prices with AK as the driver.
The Sedan and SUV are not verified and have no prices, so they will not show until verified and priced.

## Why it is slow
The servers run in the USA (Virginia) but the database is in Mumbai. In Vercel > Project > Settings > Functions, set the region to Mumbai (bom1) and redeploy. A file saying so is now in the code.

## What I changed (saved on your computer only, not pushed, not deployed)
Faster info/home pages; clearer logs for hidden cars; a checking script (`npx tsx scripts/check-rate-alignment.ts`); the secret `.env` file is no longer tracked by Git.

## You must do
1. **Change these passwords/keys** (they were stored in Git history): PayU key + salt, Zoho email key, login (JWT) secret.
2. Fix the driver/price mismatch above.
3. Tell me to push and deploy (then I re-test speed and run a live check), and confirm Vercel region.
4. Android: the Expo free plan has no builds left until 1 Nov 2026. Either wait or upgrade (`eas billing:subscribe starter --account ridegrid_wellcabs`), then run `eas build --platform android --profile production` in each app folder. Customer-app changes (about 40 files) need your review/commit first.
5. Old test data: 11 users, 1 vendor, 3 drivers, 3 vehicles, 4 customers, 3 bookings exist. Tell me which are test data and I will prepare the exact cleanup.

## Apps
Code-ready (tests pass): Customer, Vendor, Driver, Corporate Employee. Installable test APKs (preview, 2–4 Oct) exist on Expo. No Play Store file exists yet.

## To resume
Read `reports/FINAL_LAUNCH_*.md` and `RIDEGRID_FINAL_LAUNCH_MASTER_REPORT.md`.

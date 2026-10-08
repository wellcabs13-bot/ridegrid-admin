// Read-only: lists APPROVED rate versions whose pinned driver/vehicle no longer matches the vehicle's current driver.
// Such rates make the vehicle disappear from the marketplace (PRICE_UNAVAILABLE). Run: npx tsx scripts/check-rate-alignment.ts
import { prisma } from "@/lib/prisma";

(async () => {
  const versions = await prisma.pricingRateVersion.findMany({ where: { status: "APPROVED", deactivatedAt: null }, select: { id: true, service: true, vehicleCategory: true, terms: true } });
  const vehicles = new Map((await prisma.vehicle.findMany({ where: { deletedAt: null }, select: { id: true, driverId: true } })).map(v => [v.id, v.driverId]));
  const bad = versions.flatMap(v => {
    const op = (v.terms as { operational?: { vehicleId?: string; driverId?: string } } | null)?.operational;
    if (!op?.vehicleId) return [];
    const current = vehicles.get(op.vehicleId);
    return current === op.driverId ? [] : [{ rateVersionId: v.id, service: v.service, vehicleId: op.vehicleId, pinnedDriverId: op.driverId, currentDriverId: current ?? null }];
  });
  console.log(JSON.stringify({ approved: versions.length, misaligned: bad.length, bad }, null, 1));
  await prisma.$disconnect();
})();

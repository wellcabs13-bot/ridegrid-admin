import type { Prisma } from "@prisma/client";

// Approved fares are priced for one exact car + driver pair (terms.operational). When the driver on a vehicle
// changes, those fares can no longer be quoted and the car silently leaves the marketplace. These helpers only
// REPORT that situation; they never rewrite, re-approve or deactivate a rate.
export type AlignmentIssue = {
  vehicleId: string;
  registrationNumber: string | null;
  pinnedDriverId: string | null;
  pinnedDriverName: string | null;
  currentDriverId: string | null;
  rateVersionIds: string[];
  services: string[];
  reason: "DRIVER_CHANGED" | "NO_DRIVER";
  action: string;
};

type VersionRow = { id: string; service: string; terms: unknown };
type VehicleRow = { id: string; driverId: string | null; registrationNumber: string | null };

const operational = (terms: unknown) => (terms as { operational?: { vehicleId?: string; driverId?: string; driverName?: string } } | null)?.operational;

export function buildAlignmentIssues(versions: VersionRow[], vehicles: VehicleRow[]): AlignmentIssue[] {
  const byVehicle = new Map(vehicles.map(v => [v.id, v]));
  const groups = new Map<string, AlignmentIssue>();
  for (const version of versions) {
    const op = operational(version.terms);
    if (!op?.vehicleId) continue;
    const vehicle = byVehicle.get(op.vehicleId);
    if (!vehicle || vehicle.driverId === (op.driverId ?? null)) continue;
    const key = `${op.vehicleId}:${op.driverId ?? ""}`;
    const issue = groups.get(key) ?? {
      vehicleId: op.vehicleId, registrationNumber: vehicle.registrationNumber, pinnedDriverId: op.driverId ?? null, pinnedDriverName: op.driverName ?? null,
      currentDriverId: vehicle.driverId, rateVersionIds: [], services: [], reason: vehicle.driverId ? "DRIVER_CHANGED" : "NO_DRIVER",
      action: vehicle.driverId
        ? "Either assign the original driver back to this vehicle, or create and approve new fares for the current driver. Existing approved fares are not changed automatically."
        : "Assign a driver to this vehicle, or create and approve new fares once a driver is assigned.",
    } satisfies AlignmentIssue;
    issue.rateVersionIds.push(version.id);
    if (!issue.services.includes(version.service)) issue.services.push(version.service);
    groups.set(key, issue);
  }
  return [...groups.values()];
}

export async function findAlignmentIssues(db: Prisma.TransactionClient | import("@prisma/client").PrismaClient, scope: { vendorId?: string; vehicleId?: string } = {}) {
  const now = new Date();
  const versions = await db.pricingRateVersion.findMany({
    where: { status: "APPROVED", deactivatedAt: null, ...(scope.vendorId ? { vendorId: scope.vendorId } : {}), OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] },
    select: { id: true, service: true, terms: true },
  });
  const vehicles = await db.vehicle.findMany({
    where: { deletedAt: null, ...(scope.vendorId ? { vendorId: scope.vendorId } : {}), ...(scope.vehicleId ? { id: scope.vehicleId } : {}) },
    select: { id: true, driverId: true, registrationNumber: true },
  });
  return buildAlignmentIssues(versions, vehicles);
}

/** Fares that would stop being sellable if `vehicleId` were handed to `newDriverId` (null = driver removed). */
export async function ratesAffectedByDriverChange(db: Parameters<typeof findAlignmentIssues>[0], vehicleId: string, newDriverId: string | null) {
  const versions = await db.pricingRateVersion.findMany({ where: { status: "APPROVED", deactivatedAt: null }, select: { id: true, service: true, terms: true } });
  return buildAlignmentIssues(versions, [{ id: vehicleId, driverId: newDriverId, registrationNumber: null }]);
}

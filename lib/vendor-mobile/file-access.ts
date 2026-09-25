import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requestUser } from "@/lib/request-access";
import { driverScope, VendorError } from "./access";
export async function protectDocumentFile(request: NextRequest, id: string) {
  const fileUrl = `/api/files/${id}`;
  const [vehicle, driver, vendor, generic, corporate] = await Promise.all([
    prisma.vehicleDocument.findFirst({
      where: { fileUrl },
      select: { vehicle: { select: { vendorId: true } } },
    }),
    prisma.driverDocument.findFirst({
      where: { fileUrl },
      select: { driverId: true },
    }),
    prisma.vendorDocument.findFirst({
      where: { fileUrl },
      select: { vendorId: true },
    }),
    prisma.documentRecord.findFirst({
      where: { file: { fileUrl } },
      select: { entityType: true, entityId: true },
    }),
    // Corporate quotation and agreement files belong to one company.
    Promise.resolve()
      .then(() => prisma.$queryRaw<{ corporateId: string }[]>`
        SELECT "corporateId" FROM "CorporateCommercialProfile"
        WHERE "quotationFileUrl" = ${fileUrl} OR "agreementFileUrl" = ${fileUrl} LIMIT 1`)
      .then((rows) => rows?.[0] ?? null)
      .catch(() => null),
  ]);
  if (!vehicle && !driver && !vendor && !generic && !corporate) return false; // Existing public media.
  const user = await requestUser(request);
  if (!user) throw new VendorError(401, "Please sign in.");
  if (["SUPER_ADMIN", "OPERATIONS"].includes(user.role)) return true;
  if (corporate) {
    const member = user.role === "CORPORATE_ADMIN" && await prisma.corporateEmployee.findFirst({
      where: { userId: user.id, corporateId: corporate.corporateId, isActive: true },
      select: { id: true },
    });
    if (member) return true;
    throw new VendorError(403, "Document access denied.");
  }
  if (
    user.role === "DRIVER" &&
    driver &&
    (await prisma.driver.findFirst({
      where: { id: driver.driverId, userId: user.id, deletedAt: null },
    }))
  )
    return true;
  if (user.role === "VENDOR") {
    const own = await prisma.vendor.findFirst({
      where: { userId: user.id, deletedAt: null },
      select: { id: true },
    });
    if (
      own &&
      (vehicle?.vehicle.vendorId === own.id ||
        vendor?.vendorId === own.id ||
        (driver &&
          (await prisma.driver.findFirst({
            where: { id: driver.driverId, ...driverScope(own.id) },
            select: { id: true },
          }))) ||
        (generic?.entityType === "VENDOR" && generic.entityId === own.id))
    )
      return true;
  }
  throw new VendorError(403, "Document access denied.");
}

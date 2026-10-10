import { AuditAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Public media types a vendor uploads as listing photos. A file uploaded under one of
// these types that is not actually a vehicle/driver photo (e.g. an identity document
// or a spreadsheet screenshot) is quarantined rather than deleted: its record and
// file are kept for the vendor and RideGrid staff, but it no longer matches the
// public photo type, so the marketplace stops serving it and /api/files requires
// staff or owning-vendor authorisation for it.
export const MODERATED_MEDIA_TYPES = ["VEHICLE_PHOTO", "DRIVER_PHOTO"] as const;
export const QUARANTINE_SUFFIX = "_QUARANTINED";

export class MediaModerationError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export const isQuarantined = (entityType: string | null | undefined) => !!entityType?.endsWith(QUARANTINE_SUFFIX);

export async function setMediaQuarantine(input: { fileAssetId: string; quarantined: boolean; reason: string; actorId: string | null }) {
  const reason = input.reason.trim().slice(0, 300);
  if (!reason) throw new MediaModerationError(400, "A reason is required.");
  const file = await prisma.fileAsset.findUnique({ where: { id: input.fileAssetId }, select: { id: true, entityType: true, entityId: true } });
  if (!file || !file.entityType) throw new MediaModerationError(404, "File not found.");
  const base = file.entityType.replace(QUARANTINE_SUFFIX, "");
  if (!(MODERATED_MEDIA_TYPES as readonly string[]).includes(base)) throw new MediaModerationError(409, "Only listing photos can be moderated here.");
  const next = input.quarantined ? `${base}${QUARANTINE_SUFFIX}` : base;
  if (next === file.entityType) return { id: file.id, entityType: file.entityType, changed: false };
  await prisma.$transaction(async (tx) => {
    await tx.fileAsset.update({ where: { id: file.id }, data: { entityType: next } });
    await tx.auditLog.create({
      data: {
        userId: input.actorId, action: AuditAction.UPDATE, entityName: "FileAsset", entityId: file.id,
        oldValue: { entityType: file.entityType }, newValue: { entityType: next, entityId: file.entityId, reason, event: input.quarantined ? "MEDIA_QUARANTINED" : "MEDIA_RESTORED" },
      },
    });
  });
  return { id: file.id, entityType: next, changed: true };
}

// Owner of a quarantined asset, for file-access checks: vehicle -> vendor, driver -> driver.
export async function quarantinedOwner(fileUrl: string) {
  const file = await prisma.fileAsset.findFirst({ where: { fileUrl, entityType: { endsWith: QUARANTINE_SUFFIX } }, select: { entityType: true, entityId: true } });
  if (!file?.entityId) return file ? { vendorId: null, driverId: null } : null;
  if (file.entityType!.startsWith("VEHICLE_PHOTO")) {
    const v = await prisma.vehicle.findUnique({ where: { id: file.entityId }, select: { vendorId: true } });
    return { vendorId: v?.vendorId ?? null, driverId: null };
  }
  return { vendorId: null, driverId: file.entityId };
}

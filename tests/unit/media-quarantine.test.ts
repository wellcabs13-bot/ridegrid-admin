// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const m = vi.hoisted(() => ({
  requestUser: vi.fn(),
  vehicleDocument: { findFirst: vi.fn() }, driverDocument: { findFirst: vi.fn() }, vendorDocument: { findFirst: vi.fn() }, documentRecord: { findFirst: vi.fn() },
  fileAsset: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn() },
  vehicle: { findUnique: vi.fn(), findMany: vi.fn() }, vendor: { findFirst: vi.fn() }, driver: { findFirst: vi.fn() }, review: { findMany: vi.fn() },
  auditLog: { create: vi.fn() }, corporateEmployee: { findFirst: vi.fn() },
  $queryRaw: vi.fn(), $transaction: vi.fn(),
}));
vi.mock("@/lib/request-access", () => ({ requestUser: m.requestUser }));
vi.mock("@/lib/prisma", () => ({ prisma: m }));

import { protectDocumentFile } from "@/lib/vendor-mobile/file-access";
import { setMediaQuarantine } from "@/lib/services/vehicle/VehicleMediaModeration";
import { GET as listingAssets } from "@/app/api/marketplace/listing-assets/route";

beforeEach(() => {
  vi.resetAllMocks();
  for (const k of ["vehicleDocument", "driverDocument", "vendorDocument", "documentRecord"] as const) m[k].findFirst.mockResolvedValue(null);
  m.$queryRaw.mockResolvedValue([]);
  m.$transaction.mockImplementation((fn: (tx: typeof m) => unknown) => fn(m));
});

describe("mis-uploaded listing photos", () => {
  const req = () => new NextRequest("https://ridegrid.test/api/files/aadhaar");
  it("keeps ordinary vehicle photos public", async () => {
    m.fileAsset.findFirst.mockResolvedValue(null);
    await expect(protectDocumentFile(req(), "aadhaar")).resolves.toBe(false);
  });
  it("makes a quarantined photo private to RideGrid staff and the owning vendor", async () => {
    m.fileAsset.findFirst.mockResolvedValue({ entityType: "VEHICLE_PHOTO_QUARANTINED", entityId: "car-a" });
    m.vehicle.findUnique.mockResolvedValue({ vendorId: "vendor-a" });
    m.requestUser.mockResolvedValue(null);
    await expect(protectDocumentFile(req(), "aadhaar")).rejects.toMatchObject({ status: 401 });
    m.requestUser.mockResolvedValue({ id: "cust", role: "CUSTOMER" });
    await expect(protectDocumentFile(req(), "aadhaar")).rejects.toMatchObject({ status: 403 });
    m.requestUser.mockResolvedValue({ id: "other-vendor-user", role: "VENDOR" });
    m.vendor.findFirst.mockResolvedValue(null);
    await expect(protectDocumentFile(req(), "aadhaar")).rejects.toMatchObject({ status: 403 });
    m.requestUser.mockResolvedValue({ id: "owner", role: "VENDOR" });
    m.vendor.findFirst.mockResolvedValue({ id: "vendor-a" });
    await expect(protectDocumentFile(req(), "aadhaar")).resolves.toBe(true);
    m.requestUser.mockResolvedValue({ id: "ops", role: "OPERATIONS" });
    await expect(protectDocumentFile(req(), "aadhaar")).resolves.toBe(true);
  });
  it("quarantines by type change with an audit entry, never deleting the file", async () => {
    m.fileAsset.findUnique.mockResolvedValue({ id: "fa", entityType: "VEHICLE_PHOTO", entityId: "car-a" });
    await setMediaQuarantine({ fileAssetId: "fa", quarantined: true, reason: "Identity document uploaded as a vehicle photo", actorId: null });
    expect(m.fileAsset.update).toHaveBeenCalledWith({ where: { id: "fa" }, data: { entityType: "VEHICLE_PHOTO_QUARANTINED" } });
    expect(m.auditLog.create.mock.calls[0][0].data).toMatchObject({ entityName: "FileAsset", entityId: "fa", newValue: expect.objectContaining({ event: "MEDIA_QUARANTINED" }) });
    m.fileAsset.findUnique.mockResolvedValue({ id: "doc", entityType: "VEHICLE", entityId: "car-a" });
    await expect(setMediaQuarantine({ fileAssetId: "doc", quarantined: true, reason: "x", actorId: null })).rejects.toMatchObject({ status: 409 });
  });
  it("serves only explicit public photo types in marketplace listings", async () => {
    m.vehicle.findMany.mockResolvedValue([{ id: "car-a", driverId: "drv", rating: null, vendorId: "vendor-a" }]);
    m.fileAsset.findMany.mockResolvedValue([]);
    m.review.findMany.mockResolvedValue([]);
    const res = await listingAssets(new NextRequest("https://ridegrid.test/api/marketplace/listing-assets?vehicleIds=car-a"));
    expect((await res.json()).data["car-a"].vehiclePhotos).toEqual([]);
    const types = m.fileAsset.findMany.mock.calls.map((c) => c[0].where.entityType);
    expect(types).toEqual(["VEHICLE_PHOTO", "DRIVER_PHOTO"]);
  });
});

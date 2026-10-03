// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const m = vi.hoisted(() => ({
  requestUser: vi.fn(),
  storeFile: vi.fn(),
  vehicle: { findFirst: vi.fn() },
  fileAsset: { create: vi.fn() },
}));
vi.mock("@/lib/request-access", () => ({ requestUser: m.requestUser }));
vi.mock("@/lib/prisma", () => ({ prisma: { vehicle: m.vehicle, fileAsset: m.fileAsset } }));
vi.mock("@/lib/services/storage/FileStorageService", () => ({
  StorageUnavailableError: class extends Error {},
  storeFile: m.storeFile,
  validateFileType: (type: string, allowed: string[]) => allowed.includes(type),
}));

import { POST } from "@/app/api/files/upload/route";

function upload(fields: Record<string, string>, type = "image/jpeg") {
  const form = new FormData();
  form.append("file", new File([new Uint8Array([1, 2, 3])], "car.jpg", { type }));
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  return POST(new NextRequest("http://localhost/api/files/upload", { method: "POST", body: form }));
}

beforeEach(() => {
  vi.resetAllMocks();
  m.requestUser.mockResolvedValue({ id: "admin-1", role: "SUPER_ADMIN" });
  m.storeFile.mockResolvedValue({ id: "f1", name: "car.jpg", size: 3, storageKey: "media/f1/car.jpg", fileUrl: "/api/files/f1" });
});

it("links an uploaded vehicle photo to its vehicle so the marketplace can show it", async () => {
  m.vehicle.findFirst.mockResolvedValue({ id: "v1" });
  const res = await upload({ entityType: "VEHICLE_PHOTO", entityId: "v1" });
  expect(res.status).toBe(200);
  expect(m.fileAsset.create).toHaveBeenCalledWith({ data: expect.objectContaining({ id: "f1", entityType: "VEHICLE_PHOTO", entityId: "v1", fileUrl: "/api/files/f1", mimeType: "image/jpeg", uploadedBy: "admin-1" }) });
});

it("rejects a vehicle photo for an unknown vehicle or a non-image file", async () => {
  m.vehicle.findFirst.mockResolvedValue(null);
  expect((await upload({ entityType: "VEHICLE_PHOTO", entityId: "missing" })).status).toBe(400);
  expect((await upload({ entityType: "VEHICLE_PHOTO", entityId: "v1" }, "application/pdf")).status).toBe(400);
  expect(m.storeFile).not.toHaveBeenCalled();
  expect(m.fileAsset.create).not.toHaveBeenCalled();
});

it("keeps other uploads unlinked", async () => {
  expect((await upload({})).status).toBe(200);
  expect(m.fileAsset.create).not.toHaveBeenCalled();
});

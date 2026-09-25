// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({
  requestUser: vi.fn(),
  storeFile: vi.fn(),
  vendor: { findFirst: vi.fn() },
  vehicle: { findFirst: vi.fn() },
  driver: { findFirst: vi.fn() },
  vehicleDocument: { create: vi.fn(), findFirst: vi.fn() },
  vendorDocument: { create: vi.fn(), findFirst: vi.fn() },
  driverDocument: { create: vi.fn(), findFirst: vi.fn() },
  documentRecord: { findFirst: vi.fn() },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("@/lib/request-access", () => ({ requestUser: m.requestUser }));
vi.mock("@/lib/prisma", () => ({ prisma: m }));
vi.mock("@/lib/services/storage/FileStorageService", () => ({
  storeFile: m.storeFile,
}));
import { POST } from "@/app/api/mobile/vendor/documents/route";
import { protectDocumentFile } from "@/lib/vendor-mobile/file-access";
beforeEach(() => {
  vi.resetAllMocks();
  m.requestUser.mockResolvedValue({ id: "user-a", role: "VENDOR" });
  m.vendor.findFirst.mockResolvedValue({ id: "vendor-a" });
  m.$transaction.mockImplementation((fn: (tx: typeof m) => unknown) => fn(m));
  m.storeFile.mockResolvedValue({ fileUrl: "/api/files/new-doc" });
  m.vehicleDocument.create.mockResolvedValue({ id: "doc", status: "PENDING" });
});
function upload(
  entityId = "car-a",
  content = "%PDF-1.7\nQA",
  type = "application/pdf",
) {
  const form = new FormData();
  form.set("entity", "vehicle");
  form.set("entityId", entityId);
  form.set("documentType", "INSURANCE");
  form.set("status", "APPROVED");
  form.set("verifiedBy", "attacker");
  form.set("file", new File([content], "qa.pdf", { type }));
  return new NextRequest("https://ridegrid.test/api/mobile/vendor/documents", {
    method: "POST",
    body: form,
  });
}
describe("vendor documents", () => {
  it("checks ownership before storing a file", async () => {
    expect((await POST(upload("foreign-car"))).status).toBe(404);
    expect(m.storeFile).not.toHaveBeenCalled();
    expect(m.vehicle.findFirst.mock.calls[0][0].where).toEqual({
      id: "foreign-car",
      vendorId: "vendor-a",
      deletedAt: null,
    });
  });
  it("ignores verification fields and creates pending evidence", async () => {
    m.vehicle.findFirst.mockResolvedValue({ id: "car-a" });
    expect((await POST(upload())).status).toBe(200);
    expect(m.vehicleDocument.create).toHaveBeenCalledWith({
      data: {
        vehicleId: "car-a",
        documentType: "INSURANCE",
        fileUrl: "/api/files/new-doc",
        expiryDate: null,
        status: "PENDING",
      },
    });
    expect(m.auditLog.create).toHaveBeenCalled();
  });
  it("rejects mislabeled executable content", async () => {
    m.vehicle.findFirst.mockResolvedValue({ id: "car-a" });
    expect(
      (await POST(upload("car-a", "<script>alert(1)</script>"))).status,
    ).toBe(400);
    expect(m.storeFile).not.toHaveBeenCalled();
  });
  it("blocks document downloads across vendors and anonymous users", async () => {
    m.vehicleDocument.findFirst.mockResolvedValue({
      vehicle: { vendorId: "vendor-b" },
    });
    const r = new NextRequest("https://ridegrid.test/api/files/private");
    await expect(protectDocumentFile(r, "private")).rejects.toMatchObject({
      status: 403,
    });
    m.requestUser.mockResolvedValue(null);
    await expect(protectDocumentFile(r, "private")).rejects.toMatchObject({
      status: 401,
    });
  });
});

import { NextRequest } from "next/server";
import { DocumentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { storeFile } from "@/lib/services/storage/FileStorageService";
import {
  editableDriverScope,
  ok,
  required,
  vendorAccess,
  VendorError,
  vendorFailure,
} from "@/lib/vendor-mobile/access";

export async function POST(request: NextRequest) {
  try {
    const a = await vendorAccess(request);
    if (Number(request.headers.get("content-length") || 0) > 11 * 1024 * 1024)
      throw new VendorError(413, "Maximum document size is 10 MB.");
    const form = await request.formData(),
      entity = required(form.get("entity"), "document owner"),
      entityId = required(form.get("entityId"), "record"),
      type = required(
        form.get("documentType"),
        "document type",
      ) as DocumentType;
    if (
      !["vendor", "vehicle", "driver"].includes(entity) ||
      !Object.values(DocumentType).includes(type)
    )
      throw new VendorError(400, "Invalid document category.");
    const file = form.get("file");
    if (
      !(file instanceof File) ||
      file.size < 1 ||
      file.size > 10 * 1024 * 1024
    )
      throw new VendorError(400, "Choose a PDF, PNG or JPEG up to 10 MB.");
    const expiryText = form.get("expiryDate"),
      expiryDate = expiryText
        ? new Date(`${required(expiryText, "expiry date")}T00:00:00+05:30`)
        : null;
    if (
      expiryDate &&
      (!Number.isFinite(expiryDate.getTime()) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(String(expiryText)))
    )
      throw new VendorError(400, "Enter an expiry date as YYYY-MM-DD.");
    return await prisma.$transaction(
      async (tx) => {
        if (entity === "vendor" && entityId !== a.vendorId)
          throw new VendorError(404, "Record not found.");
        if (
          entity === "vehicle" &&
          !(await tx.vehicle.findFirst({
            where: { id: entityId, vendorId: a.vendorId, deletedAt: null },
            select: { id: true },
          }))
        )
          throw new VendorError(404, "Record not found.");
        if (
          entity === "driver" &&
          !(await tx.driver.findFirst({
            where: { id: entityId, ...editableDriverScope(a.vendorId) },
            select: { id: true },
          }))
        )
          throw new VendorError(404, "Record not found.");
        const content = Buffer.from(await file.arrayBuffer());
        const detected =
          content.subarray(0, 5).toString() === "%PDF-"
            ? "application/pdf"
            : content
                  .subarray(0, 8)
                  .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
              ? "image/png"
              : content[0] === 255 && content[1] === 216 && content[2] === 255
                ? "image/jpeg"
                : "";
        if (!detected || file.type !== detected)
          throw new VendorError(
            400,
            "The file content must be a valid PDF, PNG or JPEG.",
          );
        const extension =
          detected === "application/pdf"
            ? "pdf"
            : detected === "image/png"
              ? "png"
              : "jpg";
        // Existing storage service, with a canonical extension and no caller URL.
        const stored = await storeFile({
          name: `document.${extension}`,
          mimeType: detected,
          content,
        });
        const data = {
          documentType: type,
          fileUrl: stored.fileUrl,
          expiryDate,
          status: "PENDING" as const,
        };
        const doc =
          entity === "vehicle"
            ? await tx.vehicleDocument.create({
                data: { ...data, vehicleId: entityId },
              })
            : entity === "driver"
              ? await tx.driverDocument.create({
                  data: { ...data, driverId: entityId },
                })
              : await tx.vendorDocument.create({
                  data: { ...data, vendorId: a.vendorId },
                });
        await tx.auditLog.create({
          data: {
            userId: a.user.id,
            action: "CREATE",
            entityName: "Document",
            entityId: doc.id,
            newValue: {
              vendorId: a.vendorId,
              entity,
              entityId,
              documentType: type,
            },
          },
        });
        return ok({ id: doc.id, status: doc.status });
      },
      { isolationLevel: "Serializable", timeout: 20000 },
    );
  } catch (error) {
    return vendorFailure(error);
  }
}

import { centralDocumentAccess } from "@/lib/vendor-mobile/central-documents";
import { NextRequest, NextResponse } from "next/server";
import { StorageUnavailableError, storeFile, validateFileType } from "@/lib/services/storage/FileStorageService";
import { prisma } from "@/lib/prisma";
import { requestUser } from "@/lib/request-access";

// Listing photos are linked to their vehicle here; the marketplace and vehicle details
// read them back as FileAsset rows (entityType + entityId). Other uploads stay unlinked.
const LINKED_MEDIA_TYPES = new Set(["VEHICLE_PHOTO"]);

export async function POST(request: NextRequest) {
  try {
    const denied = await centralDocumentAccess(request); if (denied) return denied;
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "File is required." },
        { status: 400 }
      );
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "application/pdf",
    ];

    if (!validateFileType(file.type, allowedTypes)) {
      return NextResponse.json(
        { success: false, message: "Invalid file type." },
        { status: 400 }
      );
    }

    // Vercel rejects request bodies over 4.5 MB; fail clearly before that.
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: "File must be 4 MB or smaller." },
        { status: 413 }
      );
    }

    const entityType = String(formData.get("entityType") || "").trim();
    const entityId = String(formData.get("entityId") || "").trim();
    const linkTo = LINKED_MEDIA_TYPES.has(entityType) && entityId && file.type.startsWith("image/")
      ? await prisma.vehicle.findFirst({ where: { id: entityId, deletedAt: null }, select: { id: true } })
      : null;
    if (LINKED_MEDIA_TYPES.has(entityType) && !linkTo) {
      return NextResponse.json(
        { success: false, message: "Vehicle photo must be a JPEG/PNG image for an existing vehicle." },
        { status: 400 }
      );
    }

    const content = Buffer.from(await file.arrayBuffer());

    const stored = await storeFile({
      name: file.name,
      mimeType: file.type,
      content,
    });

    if (linkTo) {
      const user = await requestUser(request);
      await prisma.fileAsset.create({
        data: {
          id: stored.id,
          fileName: stored.name,
          originalName: file.name.slice(0, 200),
          mimeType: file.type,
          fileSize: stored.size,
          fileUrl: stored.fileUrl,
          storageKey: stored.storageKey,
          entityType,
          entityId: linkTo.id,
          uploadedBy: user?.id ?? null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: stored,
    });
  } catch (error) {
    console.error("POST /api/files/upload failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "File upload failed.",
      },
      { status: error instanceof StorageUnavailableError ? 503 : 500 }
    );
  }
}

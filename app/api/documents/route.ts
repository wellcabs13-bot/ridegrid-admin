import { NextRequest, NextResponse } from "next/server";
import { DocumentStatus, DocumentType } from "@prisma/client";
import { documentService } from "@/lib/services/documents/DocumentService";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType") || undefined;
    const entityId = searchParams.get("entityId") || undefined;
    const status = searchParams.get("status") as DocumentStatus | null;

    const documents = await documentService.documents({
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
      ...(status ? { status } : {}),
    });

    return NextResponse.json({ success: true, data: documents });
  } catch (error) {
    console.error("GET /api/documents failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (
      !body.file ||
      !body.file.fileName ||
      !body.file.fileUrl ||
      !body.entityType ||
      !body.entityId ||
      !body.documentType
    ) {
      return NextResponse.json(
        { success: false, error: "Required document/file fields are missing" },
        { status: 400 }
      );
    }

    if (!Object.values(DocumentType).includes(body.documentType)) {
      return NextResponse.json(
        { success: false, error: "Invalid documentType" },
        { status: 400 }
      );
    }

    const result = await documentService.createDocument({
      entityType: body.entityType,
      entityId: body.entityId,
      documentType: body.documentType,
      documentNumber: body.documentNumber ?? null,
      issueDate: body.issueDate ? new Date(body.issueDate) : null,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
      status: body.status ?? DocumentStatus.PENDING,
      remarks: body.remarks ?? null,
      verifiedBy: body.verifiedBy ?? null,
      file: {
        create: {
          fileName: body.file.fileName,
          originalName: body.file.originalName ?? null,
          mimeType: body.file.mimeType ?? null,
          fileSize: body.file.fileSize ?? null,
          fileUrl: body.file.fileUrl,
          storageKey: body.file.storageKey ?? null,
          entityType: body.entityType,
          entityId: body.entityId,
          uploadedBy: body.file.uploadedBy ?? null,
        },
      },
    });

    return NextResponse.json(
      { success: true, data: result },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/documents failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create document" },
      { status: 500 }
    );
  }
}

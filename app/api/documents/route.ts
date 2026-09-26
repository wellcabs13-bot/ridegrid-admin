import { centralDocumentAccess } from "@/lib/vendor-mobile/central-documents";
import { NextRequest, NextResponse } from "next/server";
import {
  DocumentStatus,
  DocumentType,
} from "@prisma/client";
import { documentService } from "@/lib/services/documents/DocumentService";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest
) {
  try {
    const denied = await centralDocumentAccess(request); if (denied) return denied;
    const { searchParams } =
      new URL(request.url);

    const entityType =
      searchParams.get("entityType") ||
      undefined;

    const entityId =
      searchParams.get("entityId") ||
      undefined;

    const status =
      searchParams.get("status") as
        | DocumentStatus
        | null;

    /*
     * Vehicle documents use the dedicated
     * VehicleDocument table.
     */
    if (
      entityType === "VEHICLE" &&
      entityId
    ) {
      const documents =
        await prisma.vehicleDocument.findMany({
          where: {
            vehicleId: entityId,
            ...(status ? { status } : {}),
          },
          orderBy: {
            createdAt: "desc",
          },
        });

      return NextResponse.json({
        success: true,
        data: documents,
      });
    }

    const documents =
      await documentService.documents({
        ...(entityType
          ? { entityType }
          : {}),
        ...(entityId
          ? { entityId }
          : {}),
        ...(status
          ? { status }
          : {}),
      });

    return NextResponse.json({
      success: true,
      data: documents,
    });
  } catch (error) {
    console.error(
      "GET /api/documents failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch documents",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const denied = await centralDocumentAccess(request); if (denied) return denied;
    const body =
      await request.json();

    if (
      !body.file ||
      !body.file.fileName ||
      !body.file.fileUrl ||
      !body.entityType ||
      !body.entityId ||
      !body.documentType
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Required document/file fields are missing",
        },
        { status: 400 }
      );
    }

    if (
      !Object.values(DocumentType).includes(
        body.documentType
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid documentType",
        },
        { status: 400 }
      );
    }

    /*
     * VEHICLE DOCUMENTS
     *
     * Use the existing VehicleDocument
     * table instead of generic DocumentRecord.
     */
    if (
      body.entityType === "VEHICLE"
    ) {
      const vehicle =
        await prisma.vehicle.findUnique({
          where: {
            id: body.entityId,
          },
        });

      if (
        !vehicle ||
        vehicle.deletedAt
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Vehicle not found",
          },
          { status: 404 }
        );
      }

      const file =
        await documentService.createFile({
          fileName:
            body.file.fileName,

          originalName:
            body.file.originalName ??
            null,

          mimeType:
            body.file.mimeType ??
            null,

          fileSize:
            body.file.fileSize ??
            null,

          fileUrl:
            body.file.fileUrl,

          storageKey:
            body.file.storageKey ??
            null,

          entityType:
            "VEHICLE",

          entityId:
            body.entityId,

          uploadedBy:
            body.file.uploadedBy ??
            null,
        });

      const document =
        await prisma.vehicleDocument.create({
          data: {
            vehicleId:
              body.entityId,

            documentType:
              body.documentType,

            documentNumber:
              body.documentNumber ??
              null,

            fileUrl:
              body.file.fileUrl,

            issueDate:
              body.issueDate
                ? new Date(
                    body.issueDate
                  )
                : null,

            expiryDate:
              body.expiryDate
                ? new Date(
                    body.expiryDate
                  )
                : null,

            status:
              body.status ??
              DocumentStatus.PENDING,

            remarks:
              body.remarks ??
              null,

            verifiedBy:
              body.verifiedBy ??
              null,
          },
        });

      return NextResponse.json(
        {
          success: true,
          data: {
            ...document,
            fileId: file.id,
          },
        },
        { status: 201 }
      );
    }

    /*
     * Existing generic document flow.
     * Vendor/other modules remain unchanged.
     */
    const result =
      await documentService.createDocument({
        entityType:
          body.entityType,

        entityId:
          body.entityId,

        documentType:
          body.documentType,

        documentNumber:
          body.documentNumber ??
          null,

        issueDate:
          body.issueDate
            ? new Date(
                body.issueDate
              )
            : null,

        expiryDate:
          body.expiryDate
            ? new Date(
                body.expiryDate
              )
            : null,

        status:
          body.status ??
          DocumentStatus.PENDING,

        remarks:
          body.remarks ??
          null,

        verifiedBy:
          body.verifiedBy ??
          null,

        file: {
          create: {
            fileName:
              body.file.fileName,

            originalName:
              body.file.originalName ??
              null,

            mimeType:
              body.file.mimeType ??
              null,

            fileSize:
              body.file.fileSize ??
              null,

            fileUrl:
              body.file.fileUrl,

            storageKey:
              body.file.storageKey ??
              null,

            entityType:
              body.entityType,

            entityId:
              body.entityId,

            uploadedBy:
              body.file.uploadedBy ??
              null,
          },
        },
      });

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "POST /api/documents failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create document",
      },
      { status: 500 }
    );
  }
}

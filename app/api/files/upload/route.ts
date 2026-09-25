import { centralDocumentAccess } from "@/lib/vendor-mobile/central-documents";
import { NextRequest, NextResponse } from "next/server";
import { storeFile, validateFileType } from "@/lib/services/storage/FileStorageService";

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

    const content = Buffer.from(await file.arrayBuffer());

    const stored = await storeFile({
      name: file.name,
      mimeType: file.type,
      content,
    });

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
      { status: 500 }
    );
  }
}

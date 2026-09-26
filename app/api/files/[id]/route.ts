import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { protectDocumentFile } from "@/lib/vendor-mobile/file-access";
import { vendorFailure } from "@/lib/vendor-mobile/access";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!/^[a-zA-Z0-9-]{1,100}$/.test(id)) return NextResponse.json({ success: false }, { status: 404 });
    const authorizedDocument = await protectDocumentFile(_request, id);
    const root = path.join(process.cwd(), "storage", "media", id);
    const files = await fs.readdir(root);
    // An upload whose database transaction failed is not public media.
    if (!authorizedDocument && files.some(name => /^document\.(pdf|png|jpg)$/i.test(name))) return NextResponse.json({ success: false }, { status: 404 });

    if (!files.length) {
      return NextResponse.json(
        { success: false, message: "File not found." },
        { status: 404 }
      );
    }

    const filePath = path.join(root, files[0]);
    const file = await fs.readFile(filePath);
    const ext = path.extname(files[0]).toLowerCase();

    const mimeTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".pdf": "application/pdf",
    };

    return new NextResponse(file, {
      headers: {
        "Content-Type": mimeTypes[ext] || "application/octet-stream",
        "Content-Disposition": `inline; filename="${files[0]}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof Error && "status" in error) return vendorFailure(error);
    return NextResponse.json(
      { success: false, message: "File not found." },
      { status: 404 }
    );
  }
}

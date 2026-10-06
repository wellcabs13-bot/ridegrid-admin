import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { protectDocumentFile } from "@/lib/vendor-mobile/file-access";
import { vendorFailure } from "@/lib/vendor-mobile/access";
import { locateStoredFile, signedFileUrl, SIGNED_URL_SECONDS } from "@/lib/services/storage/FileStorageService";

const mimeTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".pdf": "application/pdf",
};

// Authorizes the caller (documents: owner or RideGrid staff; unlinked files are public
// media), then redirects to a short-lived signed URL on the private bucket.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!/^[a-zA-Z0-9-]{1,100}$/.test(id)) return NextResponse.json({ success: false }, { status: 404 });
    const authorizedDocument = await protectDocumentFile(request, id);
    const found = await locateStoredFile(id);
    if (!found) return NextResponse.json({ success: false, message: "File not found." }, { status: 404 });
    // An upload whose database transaction failed is not public media.
    if (!authorizedDocument && /^document\.(pdf|png|jpg)$/i.test(found.name)) return NextResponse.json({ success: false }, { status: 404 });

    if (found.remoteKey) {
      const url = await signedFileUrl(found.remoteKey, SIGNED_URL_SECONDS);
      return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "private, no-store" } });
    }

    // Files bundled with the deployment before the move to object storage (read-only).
    const file = await fs.readFile(found.localPath!);
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": mimeTypes[path.extname(found.name).toLowerCase()] || "application/octet-stream",
        "Content-Disposition": `inline; filename="${found.name}"`,
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

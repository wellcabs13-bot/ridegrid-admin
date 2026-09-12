import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const root = path.join(process.cwd(), "storage", "media", id);
    const files = await fs.readdir(root);

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
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "File not found." },
      { status: 404 }
    );
  }
}
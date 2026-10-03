import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok, staffAccess, SUPER_ADMIN_ONLY } from "@/lib/admin-api";
import { CorporateAdminError } from "@/lib/corporate-admin/access";
import { documentKind, RIDEGRID_ENTITY, validateUpload } from "@/lib/corporate-admin/documents";
import { storeFile } from "@/lib/services/storage/FileStorageService";

// RideGrid/Wellcabs credentials (registration, GST certificate...) that every Corporate
// Portal shows in its "RideGrid documents" section. Published by the Super Admin only.
export async function GET(request: NextRequest) {
  const { denied } = await staffAccess(request, SUPER_ADMIN_ONLY);
  if (denied) return denied;
  try {
    const rows = await prisma.documentRecord.findMany({
      where: { ...RIDEGRID_ENTITY }, orderBy: { createdAt: "desc" }, take: 100,
      select: { id: true, category: true, title: true, status: true, supersededAt: true, createdAt: true, file: { select: { originalName: true, fileSize: true, fileUrl: true } } },
    });
    return ok(rows);
  } catch (error) { return fail(error, "GET /api/admin/ridegrid-documents"); }
}

export async function POST(request: NextRequest) {
  const { user, denied } = await staffAccess(request, SUPER_ADMIN_ONLY);
  if (denied) return denied;
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new CorporateAdminError(400, "Choose a file to upload.");
    const { kind, label } = documentKind("RIDEGRID", String(form.get("kind") ?? ""));
    const bytes = Buffer.from(await file.arrayBuffer());
    validateUpload(file, bytes);
    const replaceId = String(form.get("replaceId") ?? "").trim();
    const replaced = replaceId ? await prisma.documentRecord.findFirst({ where: { id: replaceId, ...RIDEGRID_ENTITY, supersededAt: null }, select: { id: true } }) : null;
    if (replaceId && !replaced) throw new CorporateAdminError(404, "Document not found.");
    const stored = await storeFile({ name: path.basename(file.name).slice(0, 120) || "document", mimeType: file.type, content: bytes });
    const record = await prisma.$transaction(async (tx) => {
      const asset = await tx.fileAsset.create({ data: { fileName: stored.name, originalName: file.name.slice(0, 200), mimeType: file.type, fileSize: bytes.length, fileUrl: stored.fileUrl, storageKey: stored.storageKey, entityType: "RIDEGRID_DOCUMENT", entityId: RIDEGRID_ENTITY.entityId, uploadedBy: user!.id } });
      const created = await tx.documentRecord.create({ data: { fileId: asset.id, ...RIDEGRID_ENTITY, documentType: kind === "GST_CERTIFICATE" ? "GST" : "OTHER", category: `RIDEGRID.${kind}`, title: String(form.get("title") ?? "").trim().slice(0, 120) || label, status: "APPROVED", verifiedBy: user!.id, verifiedAt: new Date() }, select: { id: true } });
      if (replaced) await tx.documentRecord.update({ where: { id: replaced.id }, data: { supersededAt: new Date() } });
      await tx.auditLog.create({ data: { userId: user!.id, action: "CREATE", entityName: "DocumentRecord", entityId: created.id, newValue: { category: `RIDEGRID.${kind}`, replaced: replaced?.id ?? null } } });
      return created;
    });
    return ok(record);
  } catch (error) {
    if (error instanceof CorporateAdminError) return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    return fail(error, "POST /api/admin/ridegrid-documents");
  }
}

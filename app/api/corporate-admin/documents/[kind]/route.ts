import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { auditEntry, corporateAdminAccess, CorporateAdminError, failure, ok } from "@/lib/corporate-admin/access";
import { companyBookings, invoiceWhere } from "@/lib/corporate-admin/read";
import { commercialProfile, companyDocumentFile, uploadCompanyDocument } from "@/lib/corporate-admin/documents";
import { generateInvoicePdf } from "@/lib/services/invoice/InvoicePdfService";
import { zipFiles } from "@/lib/utils/zip";

const MIME: Record<string, string> = { ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };
const safeName = (name: string) => name.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "document";
const headers = (type: string, disposition: string) => ({ "Content-Type": type, "Content-Disposition": disposition, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
const BULK_LIMIT = 50;

// Streams the company's own quotation, agreement, invoice(s) or uploaded documents.
// Storage paths never leave the server; every lookup is scoped to the session's company.
export async function GET(request: NextRequest, ctx: { params: Promise<{ kind: string }> }) {
  try {
    const a = await corporateAdminAccess(request);
    const { kind } = await ctx.params;
    if (kind === "invoice") {
      const invoiceId = request.nextUrl.searchParams.get("id") || "";
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(invoiceId)) throw new CorporateAdminError(400, "Invalid invoice.");
      const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, booking: companyBookings(a) }, select: { id: true } });
      if (!invoice) throw new CorporateAdminError(404, "Invoice not found.");
      const pdf = await generateInvoicePdf(invoice.id);
      return new NextResponse(new Uint8Array(pdf.buffer), { headers: headers("application/pdf", `attachment; filename="${safeName(pdf.filename)}"`) });
    }
    // Selected invoices (ids=) or every invoice matching the list filters (all=1), as one ZIP of the same PDFs.
    if (kind === "invoices") {
      const idsParam = request.nextUrl.searchParams.get("ids");
      const ids = idsParam ? idsParam.split(",").map((s) => s.trim()).filter(Boolean) : null;
      if (ids && (ids.length > BULK_LIMIT || ids.some((x) => !/^[A-Za-z0-9_-]{1,64}$/.test(x)))) throw new CorporateAdminError(400, `Select up to ${BULK_LIMIT} invoices.`);
      if (!ids && request.nextUrl.searchParams.get("all") !== "1") throw new CorporateAdminError(400, "Choose invoices to download.");
      const where = ids ? { id: { in: ids }, booking: companyBookings(a) } : await invoiceWhere(request, a);
      const rows = await prisma.invoice.findMany({ where, select: { id: true, invoiceNumber: true }, orderBy: { invoiceDate: "desc" }, take: BULK_LIMIT + 1 });
      if (!rows.length) throw new CorporateAdminError(404, "No invoices match.");
      if (rows.length > BULK_LIMIT) throw new CorporateAdminError(400, `More than ${BULK_LIMIT} invoices match. Narrow the filters and try again.`);
      const pdfs = [];
      for (const r of rows) {
        const pdf = await generateInvoicePdf(r.id);
        pdfs.push({ name: safeName(pdf.filename || `${r.invoiceNumber}.pdf`), data: new Uint8Array(pdf.buffer) });
      }
      await prisma.$transaction((tx) => auditEntry(tx, a, "EXPORT", "Invoice", rows.map((r) => r.id).join(",").slice(0, 190), undefined, { count: rows.length }));
      const stamp = new Date().toISOString().slice(0, 10);
      return new NextResponse(new Uint8Array(zipFiles(pdfs)), { headers: headers("application/zip", `attachment; filename="ridegrid-invoices-${stamp}.zip"`) });
    }
    if (kind === "file") {
      const doc = await companyDocumentFile(a, request.nextUrl.searchParams.get("id") || "");
      return new NextResponse(new Uint8Array(doc.body), { headers: headers(doc.mimeType, `inline; filename="${safeName(doc.name)}"`) });
    }
    if (kind !== "quotation" && kind !== "agreement") throw new CorporateAdminError(404, "Document not found.");
    const profile = await commercialProfile(a.corporateId);
    const url = kind === "quotation" ? profile?.quotationFileUrl : profile?.agreementFileUrl;
    const name = kind === "quotation" ? profile?.quotationFileName : profile?.agreementFileName;
    const fileId = url?.match(/^\/api\/files\/([A-Za-z0-9-]{1,100})$/)?.[1];
    if (!fileId) throw new CorporateAdminError(404, "Document not found.");
    const root = path.join(process.cwd(), "storage", "media", fileId);
    const files = await fs.readdir(root).catch(() => [] as string[]);
    if (!files.length) throw new CorporateAdminError(404, "Document not found.");
    const ext = path.extname(files[0]).toLowerCase();
    const body = await fs.readFile(path.join(root, files[0]));
    return new NextResponse(new Uint8Array(body), { headers: headers(MIME[ext] || "application/octet-stream", `inline; filename="${safeName(name || files[0])}"`) });
  } catch (e) { return failure(e); }
}

// Uploads a client or commercial document for the session's company (multipart form).
export async function POST(request: NextRequest, ctx: { params: Promise<{ kind: string }> }) {
  try {
    const a = await corporateAdminAccess(request);
    if ((await ctx.params).kind !== "upload") throw new CorporateAdminError(404, "Not found.");
    if (!request.headers.get("content-type")?.includes("multipart/form-data")) throw new CorporateAdminError(400, "Invalid upload.");
    const form = await request.formData();
    for (const key of ["corporateId", "companyId"]) { const v = form.get(key); if (v && v !== a.corporateId) throw new CorporateAdminError(403, "This company is not available to you."); }
    return ok(await uploadCompanyDocument(a, form));
  } catch (e) { return failure(e); }
}

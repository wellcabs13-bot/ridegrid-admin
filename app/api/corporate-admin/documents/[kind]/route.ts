import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { corporateAdminAccess, CorporateAdminError, failure } from "@/lib/corporate-admin/access";
import { commercialProfile, companyBookings } from "@/lib/corporate-admin/read";
import { generateInvoicePdf } from "@/lib/services/invoice/InvoicePdfService";

const MIME: Record<string, string> = { ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };
const safeName = (name: string) => name.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "document";

// Streams the company's own quotation, agreement or invoice. Storage paths never leave the server.
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
      return new NextResponse(new Uint8Array(pdf.buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${safeName(pdf.filename)}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
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
    return new NextResponse(new Uint8Array(body), {
      headers: { "Content-Type": MIME[ext] || "application/octet-stream", "Content-Disposition": `inline; filename="${safeName(name || files[0])}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch (e) { return failure(e); }
}

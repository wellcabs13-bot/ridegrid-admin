import path from "path";
import { DocumentType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { readStoredFile, storeFile } from "@/lib/services/storage/FileStorageService";
import { AdminAccess, auditEntry, CorporateAdminError } from "./access";

// Company documents live in the shared FileAsset + DocumentRecord store. A record's
// category is "<SECTION>.<KIND>"; its file is only ever streamed through an access-
// checked route, never exposed by storage path.
//   RIDEGRID   - RideGrid/Wellcabs credentials, published by RideGrid to every client
//   CLIENT     - the corporate client's own compliance documents
//   COMMERCIAL - quotations, agreements and amendments between the two parties
export const DOCUMENT_KINDS = {
  RIDEGRID: { COMPANY_REGISTRATION: "Company registration", GST_CERTIFICATE: "GST certificate", BUSINESS_CREDENTIAL: "Business credential", OTHER: "Other RideGrid document" },
  CLIENT: { GST_CERTIFICATE: "GST certificate", INCORPORATION: "Incorporation / company registration", PAN: "PAN / tax document", BILLING_ONBOARDING: "Billing / onboarding form", OTHER_COMPLIANCE: "Other compliance document" },
  COMMERCIAL: { QUOTATION: "Quotation", AGREEMENT: "Agreement", AMENDMENT: "Amendment", OTHER_SUPPORTING: "Other supporting document" },
} as const;
export type DocumentSection = keyof typeof DOCUMENT_KINDS;

const TYPE_OF: Record<string, DocumentType> = { GST_CERTIFICATE: "GST", PAN: "PAN" };
export const RIDEGRID_ENTITY = { entityType: "RIDEGRID", entityId: "WELLCABS" } as const;
const MAX_BYTES = 10 * 1024 * 1024;
const MIME: Record<string, { ext: string; magic: number[] }> = {
  "application/pdf": { ext: ".pdf", magic: [0x25, 0x50, 0x44, 0x46] },
  "image/png": { ext: ".png", magic: [0x89, 0x50, 0x4e, 0x47] },
  "image/jpeg": { ext: ".jpg", magic: [0xff, 0xd8, 0xff] },
};

export function documentKind(section: string, kind: string) {
  const kinds = DOCUMENT_KINDS[section as DocumentSection] as Record<string, string> | undefined;
  if (!kinds || !(kind in kinds)) throw new CorporateAdminError(400, "Choose a document type.");
  return { section: section as DocumentSection, kind, label: kinds[kind] };
}

// Content must match the declared type; a renamed executable or HTML file is rejected.
export function validateUpload(file: File, bytes: Buffer) {
  const spec = MIME[file.type];
  if (!spec) throw new CorporateAdminError(400, "Upload a PDF, PNG or JPEG file.");
  if (!bytes.length || bytes.length > MAX_BYTES) throw new CorporateAdminError(400, "Files must be between 1 byte and 10 MB.");
  if (!spec.magic.every((b, i) => bytes[i] === b)) throw new CorporateAdminError(400, "The file content does not match its type.");
  return spec;
}

const recordSelect = {
  id: true, category: true, title: true, status: true, documentNumber: true, remarks: true, createdAt: true, supersededAt: true, entityType: true, entityId: true,
  file: { select: { originalName: true, mimeType: true, fileSize: true, uploadedBy: true } },
} satisfies Prisma.DocumentRecordSelect;

type RecordRow = Prisma.DocumentRecordGetPayload<{ select: typeof recordSelect }>;

async function uploaderNames(rows: RecordRow[]) {
  const ids = [...new Set(rows.map((r) => r.file.uploadedBy).filter((x): x is string => !!x))];
  const users = ids.length ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, role: true } }) : [];
  return new Map(users.map((u) => [u.id, u.role === "SUPER_ADMIN" || u.role === "OPERATIONS" || u.role === "FINANCE" ? "RideGrid" : u.name]));
}

function view(r: RecordRow, names: Map<string, string>) {
  const [section, kind] = (r.category ?? "").split(".");
  const kinds = DOCUMENT_KINDS[section as DocumentSection] as Record<string, string> | undefined;
  return {
    id: r.id, section, kind, kindLabel: kinds?.[kind] ?? "Document", title: r.title || kinds?.[kind] || "Document",
    status: r.supersededAt ? "SUPERSEDED" : r.status, documentNumber: r.documentNumber, remarks: r.remarks,
    fileName: r.file.originalName ?? "document", mimeType: r.file.mimeType, size: r.file.fileSize,
    uploadedBy: r.file.uploadedBy ? names.get(r.file.uploadedBy) ?? "RideGrid" : "RideGrid", uploadedAt: r.createdAt, supersededAt: r.supersededAt,
    url: `/api/corporate-admin/documents/file?id=${encodeURIComponent(r.id)}`,
  };
}

type CommercialRow = { serviceTypes: unknown; expectedMonthlyBookings: number | null; quotationFileUrl: string | null; quotationFileName: string | null; agreementFileUrl: string | null; agreementFileName: string | null; updatedAt: Date };

// The commercial profile table (read with raw SQL - see schema note). The RideGrid
// customer tier is an internal sales classification and is not returned.
export async function commercialProfile(corporateId: string) {
  const rows = await prisma.$queryRaw<CommercialRow[]>`
    SELECT "serviceTypes", "expectedMonthlyBookings", "quotationFileUrl", "quotationFileName", "agreementFileUrl", "agreementFileName", "updatedAt"
    FROM "CorporateCommercialProfile" WHERE "corporateId" = ${corporateId} LIMIT 1`;
  return rows[0] ?? null;
}

export async function commercial(a: AdminAccess) {
  const [profile, contracts, rows] = await Promise.all([
    commercialProfile(a.corporateId).catch(() => null),
    prisma.corporateContract.findMany({ where: { corporateId: a.corporateId }, select: { id: true, contractNumber: true, startDate: true, endDate: true, isActive: true, signedBy: true }, orderBy: { startDate: "desc" }, take: 20 }),
    prisma.documentRecord.findMany({
      where: { OR: [{ entityType: "CORPORATE", entityId: a.corporateId }, { ...RIDEGRID_ENTITY }], category: { not: null } },
      select: recordSelect, orderBy: { createdAt: "desc" }, take: 300,
    }),
  ]);
  const names = await uploaderNames(rows);
  const docs = rows.map((r) => view(r, names));
  // Quotation and agreement files attached by RideGrid on the commercial profile.
  const legacy = (kind: "quotation" | "agreement", url: string | null, name: string | null, at: Date | undefined) =>
    url ? [{ id: `profile-${kind}`, section: "COMMERCIAL", kind: kind.toUpperCase(), kindLabel: kind === "quotation" ? "Quotation" : "Agreement", title: kind === "quotation" ? "Quotation" : "Corporate agreement", status: "APPROVED", documentNumber: null, remarks: null, fileName: name || `${kind}.pdf`, mimeType: null, size: null, uploadedBy: "RideGrid", uploadedAt: at ?? null, supersededAt: null, url: `/api/corporate-admin/documents/${kind}` }] : [];
  const commercialDocs = [...legacy("quotation", profile?.quotationFileUrl ?? null, profile?.quotationFileName ?? null, profile?.updatedAt), ...legacy("agreement", profile?.agreementFileUrl ?? null, profile?.agreementFileName ?? null, profile?.updatedAt), ...docs.filter((d) => d.section === "COMMERCIAL")];
  const kinds = (s: DocumentSection) => Object.entries(DOCUMENT_KINDS[s]).map(([value, label]) => ({ value, label }));
  return {
    sections: {
      RIDEGRID: { documents: docs.filter((d) => d.section === "RIDEGRID"), kinds: kinds("RIDEGRID"), canUpload: false },
      CLIENT: { documents: docs.filter((d) => d.section === "CLIENT"), kinds: kinds("CLIENT"), canUpload: true },
      COMMERCIAL: { documents: commercialDocs, kinds: kinds("COMMERCIAL"), canUpload: true },
    },
    profile: {
      serviceTypes: Array.isArray(profile?.serviceTypes) ? (profile!.serviceTypes as unknown[]).filter((s): s is string => typeof s === "string") : [],
      expectedMonthlyBookings: profile?.expectedMonthlyBookings ?? null, updatedAt: profile?.updatedAt ?? null,
    },
    contracts,
    limits: { maxMb: MAX_BYTES / 1024 / 1024, types: ["PDF", "PNG", "JPEG"] },
  };
}

// Stores an upload for this company (CLIENT or COMMERCIAL). Replacing keeps the old
// record with supersededAt so the version history remains.
export async function uploadCompanyDocument(a: AdminAccess, form: FormData) {
  const file = form.get("file");
  if (!(file instanceof File)) throw new CorporateAdminError(400, "Choose a file to upload.");
  const { section, kind, label } = documentKind(String(form.get("section") ?? ""), String(form.get("kind") ?? ""));
  if (section === "RIDEGRID") throw new CorporateAdminError(403, "RideGrid documents are published by RideGrid.");
  const title = String(form.get("title") ?? "").trim().slice(0, 120) || label;
  const documentNumber = String(form.get("documentNumber") ?? "").trim().slice(0, 60) || null;
  const replaceId = String(form.get("replaceId") ?? "").trim();
  if (replaceId && !/^[A-Za-z0-9_-]{1,64}$/.test(replaceId)) throw new CorporateAdminError(400, "Invalid document.");
  const bytes = Buffer.from(await file.arrayBuffer());
  validateUpload(file, bytes);
  const replaced = replaceId
    ? await prisma.documentRecord.findFirst({ where: { id: replaceId, entityType: "CORPORATE", entityId: a.corporateId, supersededAt: null }, select: { id: true, category: true } })
    : null;
  if (replaceId && !replaced) throw new CorporateAdminError(404, "Document not found.");
  const stored = await storeFile({ name: path.basename(file.name).slice(0, 120) || `document${MIME[file.type].ext}`, mimeType: file.type, content: bytes });
  return prisma.$transaction(async (tx) => {
    const asset = await tx.fileAsset.create({ data: { fileName: stored.name, originalName: file.name.slice(0, 200), mimeType: file.type, fileSize: bytes.length, fileUrl: stored.fileUrl, storageKey: stored.storageKey, entityType: "CORPORATE_DOCUMENT", entityId: a.corporateId, uploadedBy: a.user.id } });
    const record = await tx.documentRecord.create({
      data: { fileId: asset.id, entityType: "CORPORATE", entityId: a.corporateId, documentType: TYPE_OF[kind] ?? "OTHER", category: `${section}.${kind}`, title, documentNumber, status: "PENDING" },
      select: { id: true },
    });
    if (replaced) await tx.documentRecord.update({ where: { id: replaced.id }, data: { supersededAt: new Date() } });
    await auditEntry(tx, a, "CREATE", "DocumentRecord", record.id, replaced ? { replaced: replaced.id } : undefined, { category: `${section}.${kind}`, title, fileName: file.name.slice(0, 200), size: bytes.length });
    return { id: record.id, replaced: replaced?.id ?? null };
  });
}

// Streams a document visible to this company: its own records or RideGrid's published ones.
export async function companyDocumentFile(a: AdminAccess, recordId: string) {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(recordId)) throw new CorporateAdminError(400, "Invalid document.");
  const r = await prisma.documentRecord.findFirst({
    where: { id: recordId, category: { not: null }, OR: [{ entityType: "CORPORATE", entityId: a.corporateId }, { ...RIDEGRID_ENTITY }] },
    select: { id: true, title: true, file: { select: { fileUrl: true, originalName: true, mimeType: true } } },
  });
  const fileId = r?.file.fileUrl.match(/^\/api\/files\/([A-Za-z0-9-]{1,100})$/)?.[1];
  if (!r || !fileId) throw new CorporateAdminError(404, "Document not found.");
  const stored = await readStoredFile(fileId);
  if (!stored) throw new CorporateAdminError(404, "Document not found.");
  return { body: stored.body, name: r.file.originalName || stored.name, mimeType: r.file.mimeType && MIME[r.file.mimeType] ? r.file.mimeType : "application/octet-stream" };
}

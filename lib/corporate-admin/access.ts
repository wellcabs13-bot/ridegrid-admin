import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requestUser } from "@/lib/request-access";
import { CorporateApprovalError } from "@/lib/services/corporate/CorporateApprovalService";

export class CorporateAdminError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export type AdminAccess = {
  user: { id: string; name: string };
  corporateId: string;
  adminEmployeeId: string;
  company: { id: string; companyName: string; status: string };
};

// Company identity always comes from the Corporate Admin's own active membership.
// A client-supplied company identifier is accepted only when it names that company.
const IDENTITY_KEYS = ["corporateId", "companyId"] as const;

export function assertOwnCompany(source: Record<string, unknown>, a: AdminAccess) {
  for (const key of IDENTITY_KEYS) {
    const value = source[key];
    if (value === undefined || value === null || value === "") continue;
    if (value !== a.corporateId) throw new CorporateAdminError(403, "This company is not available to you.");
  }
}

export async function corporateAdminAccess(request: NextRequest): Promise<AdminAccess> {
  const user = await requestUser(request);
  if (!user) throw new CorporateAdminError(401, "Please sign in.");
  if (user.role !== "CORPORATE_ADMIN") throw new CorporateAdminError(403, "Corporate administrator access is required.");
  const mutation = !["GET", "HEAD"].includes(request.method);
  const origin = request.headers.get("origin");
  if (mutation && ((origin && origin !== request.nextUrl.origin) || request.headers.get("sec-fetch-site") === "cross-site"))
    throw new CorporateAdminError(403, "Cross-site changes are not allowed.");
  const membership = await prisma.corporateEmployee.findFirst({
    where: { userId: user.id },
    select: { id: true, isActive: true, corporateId: true, corporate: { select: { id: true, companyName: true, status: true, deletedAt: true } } },
  });
  if (!membership || !membership.isActive || membership.corporate.deletedAt)
    throw new CorporateAdminError(403, "Your company administrator profile is inactive. Contact RideGrid support.");
  // A suspended or inactive company keeps read access to its records but cannot change them.
  if (mutation && membership.corporate.status !== "ACTIVE")
    throw new CorporateAdminError(403, "Your company account is not active. Contact RideGrid support.");
  const a: AdminAccess = {
    user: { id: user.id, name: user.name },
    corporateId: membership.corporateId,
    adminEmployeeId: membership.id,
    company: { id: membership.corporate.id, companyName: membership.corporate.companyName, status: membership.corporate.status },
  };
  assertOwnCompany(Object.fromEntries(request.nextUrl.searchParams.entries()), a);
  return a;
}

// Writes to the shared AuditLog table inside the mutation's own transaction.
export function auditEntry(
  tx: Prisma.TransactionClient,
  a: AdminAccess,
  action: "CREATE" | "UPDATE" | "DELETE" | "EXPORT",
  entityName: string,
  entityId: string,
  oldValue?: unknown,
  newValue?: unknown,
) {
  const json = (v: unknown) => (v === undefined ? undefined : (JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue));
  return tx.auditLog.create({
    data: {
      userId: a.user.id, action, entityName, entityId,
      oldValue: json(oldValue), newValue: json(newValue === undefined ? undefined : { ...(newValue as object), corporateId: a.corporateId, via: "CORPORATE_ADMIN_PORTAL" }),
    },
  });
}

export const ok = (data: unknown, status = 200) => NextResponse.json({ success: true, data }, { status, headers: { "Cache-Control": "private, no-store" } });

export function failure(e: unknown) {
  if (e instanceof CorporateAdminError || e instanceof CorporateApprovalError)
    return NextResponse.json({ success: false, message: e.message }, { status: e.status });
  if (e && typeof e === "object" && "code" in e) {
    if (e.code === "P2002") return NextResponse.json({ success: false, message: "A record with these details already exists." }, { status: 409 });
    if (e.code === "P2034") return NextResponse.json({ success: false, message: "This record changed. Refresh and retry." }, { status: 409 });
  }
  if (e instanceof SyntaxError) return NextResponse.json({ success: false, message: "Invalid request." }, { status: 400 });
  console.error("Corporate admin request failed", e);
  return NextResponse.json({ success: false, message: "Unable to complete the request. Please retry." }, { status: 500 });
}

export function text(value: unknown, name: string, { max = 200, optional = false } = {}) {
  if (value === undefined || value === null || value === "") {
    if (optional) return null;
    throw new CorporateAdminError(400, `${name} is required.`);
  }
  if (typeof value !== "string" || value.trim().length > max) throw new CorporateAdminError(400, `Invalid ${name.toLowerCase()}.`);
  const v = value.trim();
  if (!v && !optional) throw new CorporateAdminError(400, `${name} is required.`);
  return v || null;
}

export function money(value: unknown, name: string, { optional = true, max = 100000000 } = {}) {
  if (value === undefined || value === null || value === "") {
    if (optional) return null;
    throw new CorporateAdminError(400, `${name} is required.`);
  }
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n) || n < 0 || n > max) throw new CorporateAdminError(400, `Invalid ${name.toLowerCase()}.`);
  return new Prisma.Decimal(n.toFixed(2));
}

export function id(value: unknown, name = "record") {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(value)) throw new CorporateAdminError(400, `Invalid ${name}.`);
  return value;
}

export function pageOf(request: NextRequest) {
  const value = Number(request.nextUrl.searchParams.get("page") || 1);
  if (!Number.isSafeInteger(value) || value < 1 || value > 10000) throw new CorporateAdminError(400, "Invalid page.");
  return value;
}

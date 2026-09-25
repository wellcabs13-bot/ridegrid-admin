import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requestUser } from "@/lib/request-access";
import { PricingError } from "@/lib/services/pricing/engine";
import { CorporateApprovalError } from "@/lib/services/corporate/CorporateApprovalService";
import { BookingConflictError, MarketplaceBookingError } from "@/lib/services/booking/MarketplaceBookingService";

export class CorporateMobileError extends Error {
  constructor(public status: number, message: string, public code?: string) { super(message); }
}

export const employeeSelect = {
  id: true, corporateId: true, userId: true, isActive: true, employeeName: true, employeeCode: true, officialEmail: true,
  mobile: true, designation: true, employeeGrade: true, managerName: true, isApprover: true,
  monthlyTravelLimit: true, yearlyTravelLimit: true, defaultPickupAddress: true,
  branch: { select: { branchName: true, city: true } },
  department: { select: { departmentName: true } },
  costCenter: { select: { name: true } },
  corporate: { select: { id: true, companyName: true, status: true, deletedAt: true, approvalFlow: true, billingCycle: true } },
} satisfies Prisma.CorporateEmployeeSelect;

export type Employee = Prisma.CorporateEmployeeGetPayload<{ select: typeof employeeSelect }>;
export type EmployeeAccess = { user: { id: string; name: string }; employee: Employee & { userId: string } };

// Identity fields a client could try to substitute. Company and employee identity
// always come from the authenticated session, never from the request.
const IDENTITY_KEYS = ["corporateId", "companyId", "employeeId", "userId", "customerId"] as const;

export function assertNoForeignIdentity(source: Record<string, unknown>, a: EmployeeAccess) {
  const own: Record<string, string> = {
    corporateId: a.employee.corporateId, companyId: a.employee.corporateId,
    employeeId: a.employee.id, userId: a.user.id,
  };
  for (const key of IDENTITY_KEYS) {
    const value = source[key];
    if (value === undefined || value === null || value === "") continue;
    if (value !== own[key]) throw new CorporateMobileError(403, "Account access denied.");
  }
}

export async function corporateEmployeeAccess(request: NextRequest): Promise<EmployeeAccess> {
  const user = await requestUser(request);
  if (!user) throw new CorporateMobileError(401, "Please sign in.");
  if (user.role !== "CORPORATE_EMPLOYEE") throw new CorporateMobileError(403, "A corporate employee account is required.");
  const origin = request.headers.get("origin");
  if (!["GET", "HEAD"].includes(request.method) && ((origin && origin !== request.nextUrl.origin) || request.headers.get("sec-fetch-site") === "cross-site"))
    throw new CorporateMobileError(403, "Cross-site changes are not allowed.");
  const employee = await prisma.corporateEmployee.findFirst({ where: { userId: user.id }, select: employeeSelect });
  if (!employee || !employee.isActive || !employee.userId)
    throw new CorporateMobileError(403, "Your corporate employee profile is inactive. Contact your travel administrator.");
  if (employee.corporate.deletedAt || employee.corporate.status !== "ACTIVE")
    throw new CorporateMobileError(403, "Your company account is not active. Contact your travel administrator.");
  const a = { user: { id: user.id, name: user.name }, employee: employee as EmployeeAccess["employee"] };
  assertNoForeignIdentity(Object.fromEntries(request.nextUrl.searchParams.entries()), a);
  return a;
}

export const ok = (data: unknown) => NextResponse.json({ success: true, data }, { headers: { "Cache-Control": "private, no-store" } });

export function failure(e: unknown) {
  if (e instanceof CorporateMobileError) return NextResponse.json({ success: false, code: e.code, message: e.message }, { status: e.status });
  if (e instanceof CorporateApprovalError || e instanceof MarketplaceBookingError) return NextResponse.json({ success: false, message: e.message }, { status: e.status });
  if (e instanceof BookingConflictError) return NextResponse.json({ success: false, message: e.message }, { status: 409 });
  if (e instanceof PricingError) return NextResponse.json({ success: false, code: e.code, message: e.message }, { status: e.status });
  const conflict = e && typeof e === "object" && "code" in e && ["P2034", "P2002"].includes(String(e.code));
  if (conflict) return NextResponse.json({ success: false, message: "This record changed. Refresh and retry." }, { status: 409 });
  if (e instanceof SyntaxError) return NextResponse.json({ success: false, message: "Invalid request." }, { status: 400 });
  console.error("Corporate employee mobile request failed", e);
  return NextResponse.json({ success: false, message: "Unable to complete the request. Please retry." }, { status: 500 });
}

export function required(value: unknown, name: string, max = 200) {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new CorporateMobileError(400, `Invalid ${name}.`);
  return value.trim();
}

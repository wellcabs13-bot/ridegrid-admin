import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requestUser } from "@/lib/request-access";
import { CorporateApprovalError, corporateApprovalService } from "@/lib/services/corporate/CorporateApprovalService";
import { approvalStatus } from "@/lib/corporate-employee-mobile/selects";

// Approvers: RideGrid Super Admin / Operations for any company, and a Corporate Admin
// only for the company they belong to. Same records the employee app reads.
async function approverScope(request: NextRequest) {
  const user = await requestUser(request);
  if (!user) return { denied: NextResponse.json({ success: false, message: "Please sign in." }, { status: 401 }) };
  if (request.method !== "GET") {
    const origin = request.headers.get("origin");
    if ((origin && origin !== request.nextUrl.origin) || request.headers.get("sec-fetch-site") === "cross-site")
      return { denied: NextResponse.json({ success: false, message: "Cross-site changes are not allowed." }, { status: 403 }) };
  }
  if (user.role === "SUPER_ADMIN" || user.role === "OPERATIONS") return { user, corporateId: null as string | null };
  if (user.role === "CORPORATE_ADMIN") {
    const membership = await prisma.corporateEmployee.findFirst({ where: { userId: user.id, isActive: true, corporate: { deletedAt: null } }, select: { corporateId: true } });
    if (membership) return { user, corporateId: membership.corporateId };
  }
  return { denied: NextResponse.json({ success: false, message: "Approver access is required." }, { status: 403 }) };
}

export async function GET(request: NextRequest) {
  try {
    const scope = await approverScope(request);
    if ("denied" in scope) return scope.denied;
    const requested = request.nextUrl.searchParams.get("corporateId");
    if (scope.corporateId && requested && requested !== scope.corporateId)
      return NextResponse.json({ success: false, message: "Approver access is required." }, { status: 403 });
    const corporateId = scope.corporateId ?? requested;
    const status = request.nextUrl.searchParams.get("status");
    const rows = await prisma.corporateApprovalRequest.findMany({
      where: { ...(corporateId ? { corporateId } : {}), ...(status && ["PENDING", "APPROVED", "REJECTED", "CANCELLED"].includes(status) ? { status } : {}) },
      select: {
        id: true, corporateId: true, status: true, amount: true, currentStage: true, submittedAt: true, completedAt: true, bookingId: true, requestSnapshot: true,
        employee: { select: { employeeName: true, employeeCode: true, designation: true, department: { select: { departmentName: true } } } },
        steps: { select: { level: true, stage: true, status: true, remarks: true, actedAt: true }, orderBy: { level: "asc" } },
      },
      orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
      take: 100,
    });
    return NextResponse.json({ success: true, data: rows.map((r) => ({ ...r, amount: r.amount?.toFixed(2) ?? null, displayStatus: approvalStatus(r) })) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("GET /api/corporate/approval-requests", error);
    return NextResponse.json({ success: false, message: "Unable to load approval requests." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const scope = await approverScope(request);
    if ("denied" in scope) return scope.denied;
    const body = await request.json().catch(() => null);
    const action = body?.action;
    if (typeof body?.id !== "string" || !body.id || (action !== "APPROVE" && action !== "REJECT"))
      return NextResponse.json({ success: false, message: "Choose a request and a decision." }, { status: 400 });
    const remarks = typeof body.remarks === "string" ? body.remarks.trim().slice(0, 500) : "";
    if (action === "REJECT" && !remarks) return NextResponse.json({ success: false, message: "Add a reason for rejecting this request." }, { status: 400 });
    const data = await corporateApprovalService.decide({ requestId: body.id, corporateId: scope.corporateId, actorUserId: scope.user.id, action, remarks });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof CorporateApprovalError) return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    if (error && typeof error === "object" && "code" in error && error.code === "P2034")
      return NextResponse.json({ success: false, message: "This request changed. Refresh and retry." }, { status: 409 });
    console.error("POST /api/corporate/approval-requests", error);
    return NextResponse.json({ success: false, message: "Unable to record the decision." }, { status: 500 });
  }
}

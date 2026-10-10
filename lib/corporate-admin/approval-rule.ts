import { prisma } from "@/lib/prisma";
import { APPROVER_LABEL } from "@/lib/services/corporate/CorporateApprovalService";
import { choosePolicy } from "@/lib/services/corporate/CorporateTravelPolicyService";

// An employee's booking-approval behaviour is not a separate setting: it is what the existing travel policy
// (assigned directly, or by department / branch / company) and the approval workflow already decide.
//   AUTO_APPROVED      the effective policy does not ask for approval on every trip
//   APPROVAL_REQUIRED  the effective policy asks for approval on every trip
// Trips that break a policy rule (limits, budgets, hours...) need approval in either mode.
export type ApprovalBehaviour = { mode: "AUTO_APPROVED" | "APPROVAL_REQUIRED"; policyName: string | null; approvers: string };

type Subject = { id: string; travelPolicyId: string | null; departmentId: string | null; branchId: string | null };

export async function approvalBehaviours(corporateId: string, people: Subject[]) {
  const out = new Map<string, ApprovalBehaviour>();
  if (!people.length) return out;
  const [policies, rules] = await Promise.all([
    prisma.corporateTravelPolicy.findMany({ where: { corporateId, isActive: true }, orderBy: { updatedAt: "desc" }, take: 200 }),
    prisma.corporateApprovalRule.findMany({ where: { corporateId, isActive: true }, orderBy: { level: "asc" }, take: 50 }),
  ]);
  for (const p of people) {
    const policy = choosePolicy(policies, p);
    const mine = rules.filter((r) =>
      (!r.scopeEmployeeId || r.scopeEmployeeId === p.id) && (!r.scopeDepartmentId || r.scopeDepartmentId === p.departmentId) && (!r.scopeBranchId || r.scopeBranchId === p.branchId));
    const labels = mine.map((r) => (APPROVER_LABEL as Record<string, string>)[r.approverType] ?? r.approverDesignation);
    out.set(p.id, {
      mode: policy?.approvalRequired ? "APPROVAL_REQUIRED" : "AUTO_APPROVED",
      policyName: policy?.policyName ?? null,
      approvers: labels.length ? [...new Set(labels)].join(" → ") : APPROVER_LABEL.CORPORATE_ADMIN,
    });
  }
  return out;
}

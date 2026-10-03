import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { corporateApprovalRepository } from "@/lib/repositories/corporate/CorporateApprovalRepository";
import { emitRideGridEvent } from "@/lib/events/event-dispatcher";
import { AutomationTrigger } from "@/types/automation";

const STAGES: ApprovalStage[] = [
  "MANAGER",
  "FINANCE",
  "TRAVEL_DESK",
  "FINAL",
];

export type ApprovalStage =
  | "MANAGER"
  | "FINANCE"
  | "TRAVEL_DESK"
  | "FINAL";

export class CorporateApprovalError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// Snapshot of the exact ride an approver decides on. Price is re-quoted before booking.
export type ApprovalRequestSnapshot = {
  quoteId: string;
  listingId: string;
  pricingPackageId: string;
  vendorId: string;
  serviceType: "LOCAL" | "OUTSTATION";
  tripType: "ONEWAY" | "ROUNDTRIP";
  days: string;
  pickupDateTime: string;
  pickupAddress: string;
  dropAddress: string;
  route: { pickupCity: string; dropCity: string; packageName: string };
  vehicle: { make: string; model: string; category: string };
  vendorName: string;
  fare: { vendorFare: string; platformFee: string; taxAmount: string; finalPayable: string };
  policyReasons: string[];
  note: string;
};

type Tx = Prisma.TransactionClient;

export const APPROVER_TYPES = ["CORPORATE_ADMIN", "DEPARTMENT_HEAD", "DEPARTMENT_APPROVER", "REPORTING_MANAGER", "APPROVAL_MANAGER", "SPECIFIC_EMPLOYEE"] as const;
export type ApproverType = typeof APPROVER_TYPES[number];

export const APPROVER_LABEL: Record<ApproverType, string> = {
  CORPORATE_ADMIN: "Corporate administrator", DEPARTMENT_HEAD: "Department head", DEPARTMENT_APPROVER: "Department approver",
  REPORTING_MANAGER: "Reporting manager", APPROVAL_MANAGER: "Approval manager", SPECIFIC_EMPLOYEE: "Selected approver",
};

// The requesting employee's organisation position, used to scope and route steps.
export type ApprovalSubject = { id: string; branchId: string | null; departmentId: string | null };

type RuleLike = { maxAmount: Prisma.Decimal | null; minAmount?: Prisma.Decimal | null; scopeBranchId?: string | null; scopeDepartmentId?: string | null; scopeEmployeeId?: string | null };

// A step applies when the amount is inside [minAmount, maxAmount] and the employee is inside its scope.
export function ruleApplies(rule: RuleLike, amount?: number, subject?: ApprovalSubject) {
  if (amount !== undefined) {
    if (rule.maxAmount !== null && Number(rule.maxAmount) < amount) return false;
    if (rule.minAmount != null && Number(rule.minAmount) > amount) return false;
  }
  if (subject) {
    if (rule.scopeEmployeeId && rule.scopeEmployeeId !== subject.id) return false;
    if (rule.scopeDepartmentId && rule.scopeDepartmentId !== subject.departmentId) return false;
    if (rule.scopeBranchId && rule.scopeBranchId !== subject.branchId) return false;
  }
  return true;
}

export class CorporateApprovalService {
  async getWorkflow(corporateId: string, amount?: number, subject?: ApprovalSubject) {
    const rules =
      await corporateApprovalRepository.getRules(corporateId);

    const filtered = rules.filter((rule) => ruleApplies(rule, amount, subject));

    return {
      corporateId,
      amount: amount ?? null,
      stages: filtered.map((rule, index) => ({
        level: rule.level,
        stage:
          STAGES[index] ??
          "FINAL",
        approverDesignation:
          rule.approverDesignation,
        maxAmount:
          rule.maxAmount === null
            ? null
            : Number(rule.maxAmount),
        isActive: rule.isActive,
        approverType: ((APPROVER_TYPES as readonly string[]).includes(rule.approverType ?? "") ? rule.approverType : "CORPORATE_ADMIN") as ApproverType,
        approverEmployeeId: rule.approverEmployeeId ?? null,
      })),
    };
  }

  async getEmployeeContext(employeeId: string) {
    const employee =
      await corporateApprovalRepository.getEmployee(employeeId);

    if (!employee) {
      throw new Error("Corporate employee not found.");
    }

    return {
      employee,
      manager: {
        name: employee.managerName,
        email: employee.managerEmail,
      },
      corporate: employee.corporate,
    };
  }

  // Resolves each step's approver to a real, active employee with a login. When the
  // role is unset (e.g. no department head) or would be the requester, the step
  // falls back to the company's corporate administrators; no approver is invented.
  async resolveApprovers(corporateId: string, employeeId: string, stages: { approverType?: ApproverType; approverEmployeeId?: string | null; approverDesignation?: string }[]) {
    const who = { id: true, employeeName: true, userId: true, isActive: true, corporateId: true } as const;
    const e = await prisma.corporateEmployee.findFirst({
      where: { id: employeeId, corporateId },
      select: { id: true, reportingManager: { select: who }, approvalManager: { select: who }, department: { select: { head: { select: who }, approver: { select: who } } } },
    });
    const specific = [...new Set(stages.map((s) => (s.approverType === "SPECIFIC_EMPLOYEE" ? s.approverEmployeeId : null)).filter((x): x is string => !!x))];
    const chosen = specific.length ? await prisma.corporateEmployee.findMany({ where: { id: { in: specific }, corporateId }, select: who }) : [];
    return stages.map((s) => {
      const type = s.approverType ?? "CORPORATE_ADMIN";
      if (type === "CORPORATE_ADMIN") return { approverType: type, assignedEmployeeId: null, assignedUserId: null, approverLabel: s.approverDesignation || APPROVER_LABEL.CORPORATE_ADMIN };
      const person = type === "DEPARTMENT_HEAD" ? e?.department?.head : type === "DEPARTMENT_APPROVER" ? e?.department?.approver
        : type === "REPORTING_MANAGER" ? e?.reportingManager : type === "APPROVAL_MANAGER" ? e?.approvalManager
        : chosen.find((c) => c.id === s.approverEmployeeId);
      if (!person || !person.isActive || !person.userId || person.corporateId !== corporateId || person.id === employeeId)
        return { approverType: "CORPORATE_ADMIN" as ApproverType, assignedEmployeeId: null, assignedUserId: null, approverLabel: `Corporate administrator (${APPROVER_LABEL[type].toLowerCase()} not available)` };
      return { approverType: type, assignedEmployeeId: person.id, assignedUserId: person.userId, approverLabel: `${person.employeeName} (${APPROVER_LABEL[type].toLowerCase()})` };
    });
  }

  // Configured approval rules become the request's steps. Without rules, one
  // corporate-administrator decision is required rather than an invented approver.
  async submit(input: { corporateId: string; employeeId: string; userId: string; amount: Prisma.Decimal; snapshot: ApprovalRequestSnapshot; subject?: ApprovalSubject }) {
    const workflow = await this.getWorkflow(input.corporateId, input.amount.toNumber(), input.subject);
    const configured = workflow.stages.length ? workflow.stages : [{ level: 1, stage: "FINAL" as ApprovalStage, approverType: "CORPORATE_ADMIN" as ApproverType, approverEmployeeId: null, approverDesignation: APPROVER_LABEL.CORPORATE_ADMIN }];
    const approvers = await this.resolveApprovers(input.corporateId, input.employeeId, configured);
    const stages = configured.map((s, i) => ({ level: s.level, stage: s.stage, ...approvers[i] }));
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.corporateApprovalRequest.findFirst({
        where: { employeeId: input.employeeId, corporateId: input.corporateId, requestSnapshot: { path: ["quoteId"], equals: input.snapshot.quoteId } },
        select: { id: true, status: true },
      });
      if (existing) return { id: existing.id, status: existing.status, created: false };
      const created = await tx.corporateApprovalRequest.create({
        data: {
          corporateId: input.corporateId, employeeId: input.employeeId, amount: input.amount,
          currentStage: stages[0].stage, status: "PENDING", requestSnapshot: input.snapshot as unknown as Prisma.InputJsonValue,
          steps: { create: stages.map((s) => ({ level: s.level, stage: s.stage, status: "PENDING", approverType: s.approverType, assignedEmployeeId: s.assignedEmployeeId, assignedUserId: s.assignedUserId, approverLabel: s.approverLabel })) },
        },
        select: { id: true, status: true },
      });
      return { ...created, created: true };
    }, { isolationLevel: "Serializable" });
    // Employee and approver notifications are automation rules on this event.
    if (result.created)
      await emitRideGridEvent({
        type: AutomationTrigger.CORPORATE_APPROVAL_REQUIRED, module: "CORPORATE", userId: input.userId,
        metadata: { approvalId: result.id, corporateId: input.corporateId, employeeId: input.employeeId, pickupDateTime: input.snapshot.pickupDateTime, approverUserIds: stages[0].assignedUserId ? [stages[0].assignedUserId] : [] },
      });
    return result;
  }

  // Company administrators may decide any pending step. An employee approver
  // (actorEmployeeId) may decide only the step assigned to them, never their own request.
  async decide(input: { requestId: string; corporateId: string | null; actorUserId: string; action: "APPROVE" | "REJECT"; remarks?: string; actorEmployeeId?: string }) {
    const { notify, nextApprover, ...decision } = await prisma.$transaction(async (tx) => {
      const request = await tx.corporateApprovalRequest.findFirst({
        where: { id: input.requestId, ...(input.corporateId ? { corporateId: input.corporateId } : {}) },
        include: { steps: { orderBy: { level: "asc" } }, employee: { select: { userId: true } } },
      });
      if (!request) throw new CorporateApprovalError(404, "Approval request not found.");
      if (request.status !== "PENDING") throw new CorporateApprovalError(409, "This request has already been decided.");
      const snapshot = request.requestSnapshot as unknown as ApprovalRequestSnapshot | null;
      if (input.action === "APPROVE" && snapshot && Date.parse(snapshot.pickupDateTime) <= Date.now())
        throw new CorporateApprovalError(409, "The requested pickup time has passed.");
      const step = request.steps.find((s) => s.status === "PENDING");
      if (!step) throw new CorporateApprovalError(409, "No pending approval step remains.");
      if (input.actorEmployeeId && (step.assignedEmployeeId !== input.actorEmployeeId || request.employeeId === input.actorEmployeeId))
        throw new CorporateApprovalError(403, "This approval step is not assigned to you.");
      const status = input.action === "APPROVE" ? "APPROVED" : "REJECTED";
      const acted = await tx.corporateApprovalStep.updateMany({
        where: { id: step.id, status: "PENDING" },
        data: { status, approverId: input.actorUserId, remarks: input.remarks || null, actedAt: new Date() },
      });
      if (acted.count !== 1) throw new CorporateApprovalError(409, "This request changed. Refresh and retry.");
      const next = request.steps.find((s) => s.status === "PENDING" && s.id !== step.id);
      const final = status === "REJECTED" || !next;
      const updated = await tx.corporateApprovalRequest.updateMany({
        where: { id: request.id, status: "PENDING" },
        data: final ? { status, completedAt: new Date() } : { currentStage: next!.stage },
      });
      if (updated.count !== 1) throw new CorporateApprovalError(409, "This request changed. Refresh and retry.");
      return {
        id: request.id, status: final ? status : "PENDING", currentStage: final ? request.currentStage : next!.stage,
        notify: final ? { status, corporateId: request.corporateId, employeeUserId: request.employee.userId ?? undefined } : null,
        nextApprover: final ? null : { corporateId: request.corporateId, employeeId: request.employeeId, assignedUserId: next!.assignedUserId, pickupDateTime: snapshot?.pickupDateTime ?? null },
      };
    }, { isolationLevel: "Serializable" });
    // The next step's approvers are alerted through the same approval-required automation.
    // No traveller is set on this event, so the employee is notified only at the final decision.
    if (nextApprover)
      await emitRideGridEvent({
        type: AutomationTrigger.CORPORATE_APPROVAL_REQUIRED, module: "CORPORATE",
        metadata: { approvalId: decision.id, corporateId: nextApprover.corporateId, employeeId: nextApprover.employeeId, pickupDateTime: nextApprover.pickupDateTime, stage: decision.currentStage, approverUserIds: nextApprover.assignedUserId ? [nextApprover.assignedUserId] : [] },
      });
    // The employee is notified by automation rules once the request is finally decided.
    if (notify)
      await emitRideGridEvent({
        type: notify.status === "APPROVED" ? AutomationTrigger.CORPORATE_APPROVED : AutomationTrigger.CORPORATE_REJECTED,
        module: "CORPORATE", userId: notify.employeeUserId,
        metadata: { approvalId: decision.id, corporateId: notify.corporateId, actorId: input.actorUserId, remarks: input.remarks || null },
      });
    return decision;
  }

  async cancel(requestId: string, employeeId: string) {
    const result = await prisma.corporateApprovalRequest.updateMany({
      where: { id: requestId, employeeId, bookingId: null, status: { in: ["PENDING", "APPROVED"] } },
      data: { status: "CANCELLED", completedAt: new Date() },
    });
    if (result.count !== 1) throw new CorporateApprovalError(409, "This request can no longer be cancelled.");
    return { id: requestId, status: "CANCELLED" };
  }

  // Binds an approval to exactly one booking inside the booking transaction.
  async markBooked(tx: Tx, requestId: string, employeeId: string, bookingId: string) {
    const result = await tx.corporateApprovalRequest.updateMany({
      where: { id: requestId, employeeId, status: "APPROVED", bookingId: null },
      data: { bookingId },
    });
    if (result.count !== 1) throw new CorporateApprovalError(409, "This approval has already been used or is no longer valid.");
  }
}

export const corporateApprovalService =
  new CorporateApprovalService();

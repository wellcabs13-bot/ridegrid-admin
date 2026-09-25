import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { corporateApprovalRepository } from "@/lib/repositories/corporate/CorporateApprovalRepository";

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

export class CorporateApprovalService {
  async getWorkflow(corporateId: string, amount?: number) {
    const rules =
      await corporateApprovalRepository.getRules(corporateId);

    const filtered = amount === undefined
      ? rules
      : rules.filter(
          (rule) =>
            rule.maxAmount === null ||
            Number(rule.maxAmount) >= amount
        );

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

  // Configured approval rules become the request's steps. Without rules, one
  // corporate-administrator decision is required rather than an invented approver.
  async submit(input: { corporateId: string; employeeId: string; userId: string; amount: Prisma.Decimal; snapshot: ApprovalRequestSnapshot }) {
    const workflow = await this.getWorkflow(input.corporateId, input.amount.toNumber());
    const stages = workflow.stages.length ? workflow.stages : [{ level: 1, stage: "FINAL" as ApprovalStage }];
    return prisma.$transaction(async (tx) => {
      const existing = await tx.corporateApprovalRequest.findFirst({
        where: { employeeId: input.employeeId, corporateId: input.corporateId, requestSnapshot: { path: ["quoteId"], equals: input.snapshot.quoteId } },
        select: { id: true, status: true },
      });
      if (existing) return { id: existing.id, status: existing.status, created: false };
      const created = await tx.corporateApprovalRequest.create({
        data: {
          corporateId: input.corporateId, employeeId: input.employeeId, amount: input.amount,
          currentStage: stages[0].stage, status: "PENDING", requestSnapshot: input.snapshot as unknown as Prisma.InputJsonValue,
          steps: { create: stages.map((s) => ({ level: s.level, stage: s.stage, status: "PENDING" })) },
        },
        select: { id: true, status: true },
      });
      const admins = await tx.user.findMany({
        where: { role: "CORPORATE_ADMIN", isActive: true, deletedAt: null, corporateEmployee: { corporateId: input.corporateId, isActive: true } },
        select: { id: true },
      });
      const when = new Date(input.snapshot.pickupDateTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
      await tx.notification.createMany({
        data: [
          { userId: input.userId, notificationType: "PUSH", title: "Approval requested", message: `Your ride request for ${when} is awaiting company approval.` },
          ...admins.map((a) => ({ userId: a.id, notificationType: "PUSH" as const, title: "Travel approval required", message: `A ride request for ${when} is awaiting your decision.` })),
        ],
      });
      return { ...created, created: true };
    }, { isolationLevel: "Serializable" });
  }

  async decide(input: { requestId: string; corporateId: string | null; actorUserId: string; action: "APPROVE" | "REJECT"; remarks?: string }) {
    return prisma.$transaction(async (tx) => {
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
      if (final && request.employee.userId) {
        await tx.notification.create({
          data: {
            userId: request.employee.userId, notificationType: "PUSH",
            title: status === "APPROVED" ? "Ride request approved" : "Ride request rejected",
            message: status === "APPROVED"
              ? "Your ride request was approved. Open Approvals to confirm the booking at a fresh price."
              : `Your ride request was not approved.${input.remarks ? ` Note: ${input.remarks}` : ""}`,
          },
        });
      }
      return { id: request.id, status: final ? status : "PENDING", currentStage: final ? request.currentStage : next!.stage };
    }, { isolationLevel: "Serializable" });
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

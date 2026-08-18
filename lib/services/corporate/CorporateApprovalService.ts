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
}

export const corporateApprovalService =
  new CorporateApprovalService();

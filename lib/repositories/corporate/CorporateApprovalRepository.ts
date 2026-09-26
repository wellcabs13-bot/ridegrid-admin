import { prisma } from "@/lib/prisma";

export type ApprovalStage =
  | "MANAGER"
  | "FINANCE"
  | "TRAVEL_DESK"
  | "FINAL";

export class CorporateApprovalRepository {
  async getRules(corporateId: string) {
    return prisma.corporateApprovalRule.findMany({
      where: { corporateId, isActive: true },
      orderBy: { level: "asc" },
    });
  }

  async getEmployee(employeeId: string) {
    return prisma.corporateEmployee.findUnique({
      where: { id: employeeId },
      include: {
        corporate: true,
        department: true,
        branch: true,
      },
    });
  }
}

export const corporateApprovalRepository =
  new CorporateApprovalRepository();

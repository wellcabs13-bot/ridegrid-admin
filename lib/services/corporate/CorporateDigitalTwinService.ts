import { prisma } from "@/lib/prisma";

export async function getCorporateDigitalTwin(corporateId: string) {
  if (!corporateId) throw new Error("Corporate ID is required.");

  const [branches, employees, budgets, costCenters, approvals] =
    await Promise.all([
      prisma.corporateBranch.count({ where: { corporateId } }),
      prisma.corporateEmployee.count({ where: { corporateId } }),
      prisma.corporateBudget.findMany({
        where: { corporateId },
        select: {
          allocatedAmount: true,
          utilizedAmount: true,
          status: true,
        },
      }),
      prisma.corporateCostCenter.count({ where: { corporateId } }),
      prisma.corporateApprovalRequest.count({
        where: { corporateId, status: "PENDING" },
      }),
    ]);

  const allocated = budgets.reduce(
    (sum: number, b) => sum + Number(b.allocatedAmount),
    0
  );

  const spent = budgets.reduce(
    (sum: number, b) => sum + Number(b.utilizedAmount),
    0
  );

  const remaining = allocated - spent;

  return {
    corporateId,
    structure: {
      branches,
      employees,
      costCenters,
    },
    budget: {
      allocated,
      spent,
      remaining,
      utilizationPercent:
        allocated > 0
          ? Math.round((spent / allocated) * 10000) / 100
          : 0,
    },
    approvals: {
      pending: approvals,
    },
    budgets: budgets.map((b) => ({
      status: b.status,
      allocated: Number(b.allocatedAmount),
      utilized: Number(b.utilizedAmount),
      remaining:
        Number(b.allocatedAmount) - Number(b.utilizedAmount),
    })),
    generatedAt: new Date(),
  };
}
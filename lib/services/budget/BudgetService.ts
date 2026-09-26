import { prisma } from "@/lib/prisma";
import {
  CorporateBudgetAlertType,
  CorporateBudgetStatus,
} from "@prisma/client";

export class BudgetService {
  async list(corporateId?: string) {
    return prisma.corporateBudget.findMany({
      where: corporateId ? { corporateId } : undefined,
      include: { allocations: true, alerts: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async get(id: string) {
    return prisma.corporateBudget.findUnique({
      where: { id },
      include: { allocations: true, alerts: true },
    });
  }

  async create(data: {
    corporateId: string;
    budgetName: string;
    period: "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY" | "CUSTOM";
    allocatedAmount: number;
    startDate: string;
    endDate: string;
    alertThreshold?: number;
  }) {
    if (data.allocatedAmount <= 0) {
      throw new Error("Allocated amount must be greater than zero.");
    }

    if (new Date(data.endDate) <= new Date(data.startDate)) {
      throw new Error("Budget end date must be after start date.");
    }

    return prisma.corporateBudget.create({
      data: {
        corporateId: data.corporateId,
        budgetName: data.budgetName,
        period: data.period,
        allocatedAmount: data.allocatedAmount,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        alertThreshold: data.alertThreshold,
      },
    });
  }

  async allocate(data: {
    budgetId: string;
    amount: number;
    bookingId?: string;
    description?: string;
    allocatedBy?: string;
  }) {
    if (data.amount <= 0) {
      throw new Error("Allocation amount must be greater than zero.");
    }

    return prisma.$transaction(async (tx) => {
      const budget = await tx.corporateBudget.findUnique({
        where: { id: data.budgetId },
      });

      if (!budget) throw new Error("Budget not found.");

      const now = new Date();

      if (now < budget.startDate || now > budget.endDate) {
        throw new Error("Budget is outside its active period.");
      }

      if (budget.status !== CorporateBudgetStatus.ACTIVE) {
        throw new Error("Budget is not active.");
      }

      const currentUtilized = Number(budget.utilizedAmount);
      const allocated = Number(budget.allocatedAmount);

      if (currentUtilized + data.amount > allocated) {
        throw new Error("Budget limit exceeded.");
      }

      const allocation = await tx.corporateBudgetAllocation.create({
        data: {
          budgetId: data.budgetId,
          amount: data.amount,
          bookingId: data.bookingId,
          description: data.description,
          allocatedBy: data.allocatedBy,
        },
      });

      const utilizedAmount = currentUtilized + data.amount;

      const updated = await tx.corporateBudget.update({
        where: { id: data.budgetId },
        data: {
          utilizedAmount,
          status:
            utilizedAmount >= allocated
              ? CorporateBudgetStatus.EXHAUSTED
              : CorporateBudgetStatus.ACTIVE,
        },
      });

      const threshold = budget.alertThreshold
        ? Number(budget.alertThreshold)
        : null;

      if (
        threshold !== null &&
        utilizedAmount / allocated * 100 >= threshold
      ) {
        await tx.corporateBudgetAlert.create({
          data: {
            budgetId: budget.id,
            alertType:
              utilizedAmount >= allocated
                ? CorporateBudgetAlertType.EXHAUSTED
                : CorporateBudgetAlertType.THRESHOLD,
            threshold,
            message:
              utilizedAmount >= allocated
                ? "Corporate budget has been exhausted."
                : "Corporate budget has reached its alert threshold.",
          },
        });
      }

      return { allocation, budget: updated };
    });
  }

  async validate(budgetId: string, amount: number) {
    const budget = await prisma.corporateBudget.findUnique({
      where: { id: budgetId },
    });

    if (!budget) throw new Error("Budget not found.");

    const remaining =
      Number(budget.allocatedAmount) -
      Number(budget.utilizedAmount);

    return {
      valid:
        budget.status === CorporateBudgetStatus.ACTIVE &&
        new Date() >= budget.startDate &&
        new Date() <= budget.endDate &&
        amount > 0 &&
        amount <= remaining,
      remaining,
      requested: amount,
      utilized: Number(budget.utilizedAmount),
      allocated: Number(budget.allocatedAmount),
    };
  }
}

export const budgetService = new BudgetService();

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Budgets are measured from the central Booking table: non-cancelled company
// bookings by pickup date inside the budget window. A budget is company-wide
// unless it is scoped to exactly one branch, department or employee.

export type BudgetScope = "COMPANY" | "BRANCH" | "DEPARTMENT" | "EMPLOYEE";

export type BudgetRow = {
  id: string; corporateId: string; budgetName: string; status: string;
  allocatedAmount: Prisma.Decimal; startDate: Date; endDate: Date;
  branchId: string | null; departmentId: string | null; employeeId: string | null;
};

export type BudgetTraveller = { id: string; userId: string | null; branchId: string | null; departmentId: string | null };

export function budgetScope(b: Pick<BudgetRow, "branchId" | "departmentId" | "employeeId">): BudgetScope {
  if (b.employeeId) return "EMPLOYEE";
  if (b.departmentId) return "DEPARTMENT";
  if (b.branchId) return "BRANCH";
  return "COMPANY";
}

// Bookings that count against a budget of the given scope.
export function budgetBookingWhere(b: BudgetRow, travellerUserId?: string | null): Prisma.BookingWhereInput {
  const base: Prisma.BookingWhereInput = {
    corporateId: b.corporateId, deletedAt: null, status: { not: "CANCELLED" },
    pickupDateTime: { gte: b.startDate, lte: b.endDate },
  };
  if (b.employeeId) return { ...base, customer: { userId: travellerUserId ?? "__no_login__" } };
  if (b.departmentId) return { ...base, customer: { user: { corporateEmployee: { is: { corporateId: b.corporateId, departmentId: b.departmentId } } } } };
  if (b.branchId) return { ...base, customer: { user: { corporateEmployee: { is: { corporateId: b.corporateId, branchId: b.branchId } } } } };
  return base;
}

export async function budgetSpend(b: BudgetRow, travellerUserId?: string | null) {
  const used = await prisma.booking.aggregate({ where: budgetBookingWhere(b, travellerUserId), _sum: { finalFare: true } });
  return used._sum.finalFare ?? new Prisma.Decimal(0);
}

const budgetSelect = {
  id: true, corporateId: true, budgetName: true, status: true, allocatedAmount: true, startDate: true, endDate: true,
  branchId: true, departmentId: true, employeeId: true,
} satisfies Prisma.CorporateBudgetSelect;

// Active budgets whose window contains the pickup and whose scope covers the traveller.
export async function applicableBudgets(corporateId: string, traveller: BudgetTraveller, pickup: Date) {
  const rows = await prisma.corporateBudget.findMany({
    where: {
      corporateId, status: { in: ["ACTIVE", "EXHAUSTED"] }, startDate: { lte: pickup }, endDate: { gte: pickup },
      OR: [
        { branchId: null, departmentId: null, employeeId: null },
        ...(traveller.branchId ? [{ branchId: traveller.branchId, departmentId: null, employeeId: null }] : []),
        ...(traveller.departmentId ? [{ departmentId: traveller.departmentId, employeeId: null }] : []),
        { employeeId: traveller.id },
      ],
    },
    select: budgetSelect,
    take: 20,
  });
  return Promise.all(rows.map(async (b) => {
    const used = await budgetSpend(b, traveller.userId);
    return { id: b.id, name: b.budgetName, scope: budgetScope(b), limit: b.allocatedAmount, used, remaining: Prisma.Decimal.max(b.allocatedAmount.minus(used), 0) };
  }));
}

// Child budgets (branch/department/employee) must fit inside every overlapping
// parent budget: sibling allocations of the same scope may not exceed the parent.
export async function assertBudgetFits(input: {
  corporateId: string; id?: string; allocatedAmount: Prisma.Decimal; startDate: Date; endDate: Date;
  branchId: string | null; departmentId: string | null; employeeId: string | null;
  departmentBranchId?: string | null; employeeBranchId?: string | null; employeeDepartmentId?: string | null;
}): Promise<string | null> {
  const scope = budgetScope(input);
  if (scope === "COMPANY") {
    // A company budget may not be smaller than the children already inside it.
    const children = await prisma.corporateBudget.findMany({
      where: { corporateId: input.corporateId, status: { not: "SUSPENDED" }, id: input.id ? { not: input.id } : undefined, startDate: { lte: input.endDate }, endDate: { gte: input.startDate }, OR: [{ branchId: { not: null } }, { departmentId: { not: null } }, { employeeId: { not: null } }] },
      select: { allocatedAmount: true, branchId: true, departmentId: true, employeeId: true },
    });
    for (const level of ["BRANCH", "DEPARTMENT", "EMPLOYEE"] as const) {
      const total = children.filter((c) => budgetScope(c) === level).reduce((s, c) => s.plus(c.allocatedAmount), new Prisma.Decimal(0));
      if (total.gt(input.allocatedAmount)) return `${level.charAt(0)}${level.slice(1).toLowerCase()} budgets in this period already total ₹${total.toFixed(2)}, more than this company budget.`;
    }
    return null;
  }
  const overlap = { corporateId: input.corporateId, status: { not: "SUSPENDED" as const }, startDate: { lte: input.endDate }, endDate: { gte: input.startDate } };
  const parents: { where: Prisma.CorporateBudgetWhereInput; label: string; siblings: Prisma.CorporateBudgetWhereInput }[] = [
    { where: { ...overlap, branchId: null, departmentId: null, employeeId: null }, label: "company", siblings: scope === "BRANCH" ? { branchId: { not: null }, departmentId: null, employeeId: null } : scope === "DEPARTMENT" ? { departmentId: { not: null }, employeeId: null } : { employeeId: { not: null } } },
  ];
  const branchOf = scope === "DEPARTMENT" ? input.departmentBranchId : scope === "EMPLOYEE" ? input.employeeBranchId : null;
  if (branchOf) parents.push({ where: { ...overlap, branchId: branchOf, departmentId: null, employeeId: null }, label: "branch", siblings: scope === "DEPARTMENT" ? { departmentId: { not: null }, employeeId: null, department: { branchId: branchOf } } : { employeeId: { not: null }, employee: { branchId: branchOf } } });
  if (scope === "EMPLOYEE" && input.employeeDepartmentId)
    parents.push({ where: { ...overlap, departmentId: input.employeeDepartmentId, employeeId: null }, label: "department", siblings: { employeeId: { not: null }, employee: { departmentId: input.employeeDepartmentId } } });
  for (const p of parents) {
    const parent = await prisma.corporateBudget.findFirst({ where: p.where, select: { allocatedAmount: true, budgetName: true }, orderBy: { allocatedAmount: "asc" } });
    if (!parent) continue;
    const siblings = await prisma.corporateBudget.aggregate({ where: { ...overlap, ...p.siblings, id: input.id ? { not: input.id } : undefined }, _sum: { allocatedAmount: true } });
    const total = (siblings._sum.allocatedAmount ?? new Prisma.Decimal(0)).plus(input.allocatedAmount);
    if (total.gt(parent.allocatedAmount))
      return `This allocation would exceed the ${p.label} budget "${parent.budgetName}" (₹${parent.allocatedAmount.toFixed(2)}) for the same period.`;
  }
  return null;
}

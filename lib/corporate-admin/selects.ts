import { Prisma } from "@prisma/client";
import { approvalSelect, bookingSelect, safeApproval, safeBooking } from "@/lib/corporate-employee-mobile/selects";

export const employeeSummarySelect = {
  id: true, corporateId: true, employeeName: true, employeeCode: true, designation: true, isActive: true,
  branch: { select: { id: true, branchName: true } },
  department: { select: { id: true, departmentName: true } },
} satisfies Prisma.CorporateEmployeeSelect;

type EmployeeSummary = Prisma.CorporateEmployeeGetPayload<{ select: typeof employeeSummarySelect }>;

// The central booking row plus the traveller's company-employee identity.
export const adminBookingSelect = {
  ...bookingSelect,
  corporateId: true, driverId: true,
  vendor: { select: { id: true, companyName: true } },
  customer: { select: { firstName: true, lastName: true, user: { select: { corporateEmployee: { select: employeeSummarySelect } } } } },
} satisfies Prisma.BookingSelect;

type AdminBookingRow = Prisma.BookingGetPayload<{ select: typeof adminBookingSelect }>;

export function employeeOf(e: EmployeeSummary | null | undefined, corporateId: string) {
  if (!e || e.corporateId !== corporateId) return null;
  return {
    id: e.id, name: e.employeeName, code: e.employeeCode, designation: e.designation, isActive: e.isActive,
    branch: e.branch ? { id: e.branch.id, name: e.branch.branchName } : null,
    department: e.department ? { id: e.department.id, name: e.department.departmentName } : null,
  };
}

// Assignment progress read from the same booking fields the Vendor and Driver apps write.
export function assignmentOf(b: Pick<AdminBookingRow, "status" | "driverId" | "trip">) {
  if (b.status === "CANCELLED") return "CANCELLED";
  if (b.status === "PENDING") return "AWAITING_VENDOR";
  if (!b.driverId) return "VENDOR_CONFIRMED";
  if (b.trip && !b.trip.deletedAt && b.trip.status === "ARRIVED_AT_PICKUP") return "DRIVER_ARRIVED";
  return "DRIVER_ASSIGNED";
}

export function adminBooking(b: AdminBookingRow, corporateId: string, approval?: { id: string; status: string } | null) {
  const base = safeBooking(b, approval);
  const employee = employeeOf(b.customer.user.corporateEmployee, corporateId);
  return {
    ...base,
    rebook: undefined,
    traveller: employee ? employee.name : `${b.customer.firstName} ${b.customer.lastName}`.trim(),
    employee,
    vendor: { id: b.vendor.id, companyName: b.vendor.companyName },
    assignment: assignmentOf(b),
  };
}

export const adminApprovalSelect = {
  ...approvalSelect,
  corporateId: true,
  steps: { select: { level: true, stage: true, status: true, remarks: true, actedAt: true, approverId: true }, orderBy: { level: "asc" as const } },
  employee: {
    select: {
      ...employeeSummarySelect, officialEmail: true, monthlyTravelLimit: true, yearlyTravelLimit: true,
    },
  },
} satisfies Prisma.CorporateApprovalRequestSelect;

type AdminApprovalRow = Prisma.CorporateApprovalRequestGetPayload<{ select: typeof adminApprovalSelect }>;

export function adminApproval(r: AdminApprovalRow, approvers: Map<string, string> = new Map(), booking?: { id: string; bookingNumber: string; status: string } | null) {
  const safe = safeApproval(r, booking);
  return {
    ...safe,
    employee: {
      ...employeeOf(r.employee, r.corporateId)!,
      email: r.employee.officialEmail,
      monthlyTravelLimit: r.employee.monthlyTravelLimit?.toFixed(2) ?? null,
      yearlyTravelLimit: r.employee.yearlyTravelLimit?.toFixed(2) ?? null,
    },
    // Within the company, administrators may see who decided each step.
    steps: r.steps.map((s) => ({ level: s.level, stage: s.stage, status: s.status, actedAt: s.actedAt, remarks: s.remarks, approver: s.approverId ? approvers.get(s.approverId) ?? "Company administrator" : null })),
  };
}

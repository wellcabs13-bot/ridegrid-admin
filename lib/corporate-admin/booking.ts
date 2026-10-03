import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { employeeSelect, EmployeeAccess } from "@/lib/corporate-employee-mobile/access";
import { readEmployee } from "@/lib/corporate-employee-mobile/read";
import { writeEmployee } from "@/lib/corporate-employee-mobile/write";
import { AdminAccess, CorporateAdminError } from "./access";

// The Corporate Admin Portal's own booking flow is not a second booking engine - it
// reuses the exact search/quote/policy/approval/book pipeline built for the Corporate
// Employee app, just entered through the admin's own CorporateEmployee profile (every
// Corporate Admin has one - see corporateAdminAccess's adminEmployeeId). Payment is
// therefore always Corporate Credit, travel policy and approval rules apply exactly as
// they do for any employee, and a booking that needs approval is submitted the same way.
async function employeeAccessFor(a: AdminAccess): Promise<EmployeeAccess> {
  const employee = await prisma.corporateEmployee.findFirst({ where: { id: a.adminEmployeeId, corporateId: a.corporateId }, select: employeeSelect });
  if (!employee || !employee.isActive || !employee.userId)
    throw new CorporateAdminError(403, "Your traveller profile is inactive. Contact RideGrid support.");
  return { user: a.user, employee: employee as EmployeeAccess["employee"] };
}

const READ_SECTIONS: Record<string, string> = { "booking-search": "search", "booking-config": "config" };
const WRITE_SECTIONS: Record<string, string> = { "booking-quote": "quote", "booking-book": "book", "booking-approval": "approvals" };

export function isAdminBookingReadSection(section: string) {
  return section in READ_SECTIONS;
}

export function isAdminBookingWriteSection(section: string) {
  return section in WRITE_SECTIONS;
}

export async function adminBookingRead(request: NextRequest, section: string, a: AdminAccess) {
  const employeeAccess = await employeeAccessFor(a);
  return readEmployee(request, READ_SECTIONS[section], employeeAccess);
}

export async function adminBookingWrite(section: string, b: Record<string, unknown>, a: AdminAccess) {
  const employeeAccess = await employeeAccessFor(a);
  return writeEmployee(WRITE_SECTIONS[section], b, employeeAccess);
}

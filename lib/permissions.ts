import { UserRole } from "@prisma/client";

export const Permissions = {
  isSuperAdmin: (role: UserRole) => role === UserRole.SUPER_ADMIN,
  isOperations: (role: UserRole) => role === UserRole.OPERATIONS,
  isFinance: (role: UserRole) => role === UserRole.FINANCE,
  isVendor: (role: UserRole) => role === UserRole.VENDOR,
  isDriver: (role: UserRole) => role === UserRole.DRIVER,
  isCustomer: (role: UserRole) => role === UserRole.CUSTOMER,
  isCorporateAdmin: (role: UserRole) => role === UserRole.CORPORATE_ADMIN,
  isCorporateEmployee: (role: UserRole) =>
    role === UserRole.CORPORATE_EMPLOYEE,
};
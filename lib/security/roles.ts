import { SecurityRole } from "@/types/security";

export const roleHierarchy: Record<
  SecurityRole,
  number
> = {
  SUPER_ADMIN: 100,

  OPERATIONS: 80,

  FINANCE: 70,

  CORPORATE_ADMIN: 60,

  VENDOR: 50,

  CORPORATE_EMPLOYEE: 40,

  DRIVER: 20,

  CUSTOMER: 10,
};

export function hasHigherRole(
  current: SecurityRole,
  target: SecurityRole
) {
  return (
    roleHierarchy[current] >=
    roleHierarchy[target]
  );
}
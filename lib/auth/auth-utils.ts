import { AuthUser } from "@/types/auth";
import { SecurityRole } from "@/types/security";

export function hasRole(
  user: AuthUser | null,
  role: SecurityRole
) {
  if (!user) return false;

  return user.role === role;
}

export function hasAnyRole(
  user: AuthUser | null,
  roles: SecurityRole[]
) {
  if (!user) return false;

  return roles.includes(user.role);
}

export function isAuthenticated(
  user: AuthUser | null
) {
  return user !== null;
}

export function getDashboardRoute(
  role: SecurityRole
) {
  switch (role) {
    case SecurityRole.SUPER_ADMIN:
      return "/dashboard";

    case SecurityRole.OPERATIONS:
      return "/dashboard";

    case SecurityRole.FINANCE:
      return "/finance";

    case SecurityRole.VENDOR:
      return "/vendor";

    case SecurityRole.DRIVER:
      return "/driver";

    case SecurityRole.CUSTOMER:
      return "/";

    case SecurityRole.CORPORATE_ADMIN:
      return "/corporate";

    case SecurityRole.CORPORATE_EMPLOYEE:
      return "/corporate";

    default:
      return "/";
  }
}
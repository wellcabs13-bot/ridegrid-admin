import { UserRole } from "@prisma/client";
import { Permission, hasPermission } from "./permissions";

export class RBAC {
  static can(
    role: UserRole,
    permission: Permission
  ): boolean {
    return hasPermission(role, permission);
  }

  static require(
    role: UserRole,
    permission: Permission
  ) {
    if (!hasPermission(role, permission)) {
      throw new Error("Access denied.");
    }
  }

  static any(
    role: UserRole,
    permissions: Permission[]
  ): boolean {
    return permissions.some((permission) =>
      hasPermission(role, permission)
    );
  }

  static all(
    role: UserRole,
    permissions: Permission[]
  ): boolean {
    return permissions.every((permission) =>
      hasPermission(role, permission)
    );
  }
}
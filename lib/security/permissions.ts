import {
  PermissionAction,
  SecurityRole,
} from "@/types/security";

export interface PermissionDefinition {
  module: string;
  action: PermissionAction;
}

export const permissions: PermissionDefinition[] =
  [
    {
      module: "dashboard",
      action: PermissionAction.VIEW,
    },
    {
      module: "bookings",
      action: PermissionAction.MANAGE,
    },
    {
      module: "customers",
      action: PermissionAction.MANAGE,
    },
    {
      module: "drivers",
      action: PermissionAction.MANAGE,
    },
    {
      module: "vehicles",
      action: PermissionAction.MANAGE,
    },
    {
      module: "vendors",
      action: PermissionAction.MANAGE,
    },
    {
      module: "finance",
      action: PermissionAction.MANAGE,
    },
    {
      module: "reports",
      action: PermissionAction.VIEW,
    },
    {
      module: "analytics",
      action: PermissionAction.VIEW,
    },
    {
      module: "settings",
      action: PermissionAction.MANAGE,
    },
    {
      module: "security",
      action: PermissionAction.MANAGE,
    },
    {
      module: "ai",
      action: PermissionAction.VIEW,
    },
    {
      module: "automation",
      action: PermissionAction.MANAGE,
    },
  ];

const superAdminModules =
  new Set(
    permissions.map(
      (permission) =>
        permission.module
    )
  );

const rolePermissions: Record<
  SecurityRole,
  PermissionDefinition[]
> = {
  [SecurityRole.SUPER_ADMIN]:
    permissions,

  [SecurityRole.OPERATIONS]:
    permissions.filter(
      (permission) =>
        [
          "dashboard",
          "bookings",
          "customers",
          "drivers",
          "vehicles",
          "vendors",
          "reports",
          "analytics",
          "automation",
        ].includes(
          permission.module
        )
    ),

  [SecurityRole.FINANCE]:
    permissions.filter(
      (permission) =>
        [
          "dashboard",
          "finance",
          "reports",
          "analytics",
        ].includes(
          permission.module
        )
    ),

  [SecurityRole.VENDOR]:
    permissions.filter(
      (permission) =>
        [
          "dashboard",
          "bookings",
          "vehicles",
          "drivers",
          "finance",
          "analytics",
        ].includes(
          permission.module
        )
    ),

  [SecurityRole.DRIVER]:
    permissions.filter(
      (permission) =>
        [
          "dashboard",
          "bookings",
          "vehicles",
          "analytics",
        ].includes(
          permission.module
        )
    ),

  [SecurityRole.CUSTOMER]:
    permissions.filter(
      (permission) =>
        [
          "dashboard",
          "bookings",
          "analytics",
        ].includes(
          permission.module
        )
    ),

  [SecurityRole.CORPORATE_ADMIN]:
    permissions.filter(
      (permission) =>
        [
          "dashboard",
          "bookings",
          "customers",
          "reports",
          "analytics",
        ].includes(
          permission.module
        )
    ),

  [SecurityRole.CORPORATE_EMPLOYEE]:
    permissions.filter(
      (permission) =>
        [
          "dashboard",
          "bookings",
        ].includes(
          permission.module
        )
    ),
};

export function hasPermission(
  role: SecurityRole,
  module: string,
  action: PermissionAction
): boolean {
  if (
    role === SecurityRole.SUPER_ADMIN &&
    superAdminModules.has(module)
  ) {
    return true;
  }

  return (
    rolePermissions[role]?.some(
      (permission) =>
        permission.module ===
          module &&
        permission.action ===
          action
    ) ?? false
  );
}

export function getRolePermissions(
  role: SecurityRole
): PermissionDefinition[] {
  return [
    ...(rolePermissions[role] ?? []),
  ];
}

export function canViewModule(
  role: SecurityRole,
  module: string
): boolean {
  return hasPermission(
    role,
    module,
    PermissionAction.VIEW
  );
}

export function canManageModule(
  role: SecurityRole,
  module: string
): boolean {
  return hasPermission(
    role,
    module,
    PermissionAction.MANAGE
  );
}
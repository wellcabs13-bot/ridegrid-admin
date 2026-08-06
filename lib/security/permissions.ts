import { PermissionAction } from "@/types/security";

export interface PermissionDefinition {
  module: string;
  action: PermissionAction;
}

export const permissions: PermissionDefinition[] = [
  { module: "dashboard", action: PermissionAction.VIEW },

  { module: "bookings", action: PermissionAction.MANAGE },

  { module: "customers", action: PermissionAction.MANAGE },

  { module: "drivers", action: PermissionAction.MANAGE },

  { module: "vehicles", action: PermissionAction.MANAGE },

  { module: "vendors", action: PermissionAction.MANAGE },

  { module: "finance", action: PermissionAction.MANAGE },

  { module: "reports", action: PermissionAction.VIEW },

  { module: "analytics", action: PermissionAction.VIEW },

  { module: "settings", action: PermissionAction.MANAGE },

  { module: "security", action: PermissionAction.MANAGE },

  { module: "ai", action: PermissionAction.VIEW },

  { module: "automation", action: PermissionAction.MANAGE },
];
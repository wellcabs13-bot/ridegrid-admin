import { UserRole } from "@prisma/client";

export enum Permission {
  DASHBOARD_VIEW = "dashboard.view",

  BOOKING_VIEW = "booking.view",
  BOOKING_CREATE = "booking.create",
  BOOKING_UPDATE = "booking.update",
  BOOKING_CANCEL = "booking.cancel",

  CUSTOMER_VIEW = "customer.view",
  CUSTOMER_MANAGE = "customer.manage",

  DRIVER_VIEW = "driver.view",
  DRIVER_MANAGE = "driver.manage",

  VEHICLE_VIEW = "vehicle.view",
  VEHICLE_MANAGE = "vehicle.manage",

  VENDOR_VIEW = "vendor.view",
  VENDOR_MANAGE = "vendor.manage",

  FINANCE_VIEW = "finance.view",
  FINANCE_MANAGE = "finance.manage",

  REPORT_VIEW = "report.view",

  SETTINGS_MANAGE = "settings.manage",
}

const RolePermissions: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: Object.values(Permission),

  OPERATIONS: [
    Permission.DASHBOARD_VIEW,
    Permission.BOOKING_VIEW,
    Permission.BOOKING_CREATE,
    Permission.BOOKING_UPDATE,
    Permission.DRIVER_VIEW,
    Permission.VEHICLE_VIEW,
  ],

  FINANCE: [
    Permission.DASHBOARD_VIEW,
    Permission.FINANCE_VIEW,
    Permission.FINANCE_MANAGE,
    Permission.REPORT_VIEW,
  ],

  VENDOR: [
    Permission.DASHBOARD_VIEW,
    Permission.BOOKING_VIEW,
    Permission.DRIVER_MANAGE,
    Permission.VEHICLE_MANAGE,
  ],

  DRIVER: [
    Permission.DASHBOARD_VIEW,
    Permission.BOOKING_VIEW,
  ],

  CUSTOMER: [
    Permission.BOOKING_VIEW,
    Permission.BOOKING_CREATE,
  ],

  CORPORATE_ADMIN: [
    Permission.DASHBOARD_VIEW,
    Permission.BOOKING_VIEW,
    Permission.BOOKING_CREATE,
    Permission.REPORT_VIEW,
  ],

  CORPORATE_EMPLOYEE: [
    Permission.BOOKING_VIEW,
    Permission.BOOKING_CREATE,
  ],
};

export function hasPermission(
  role: UserRole,
  permission: Permission
): boolean {
  return RolePermissions[role]?.includes(permission) ?? false;
}
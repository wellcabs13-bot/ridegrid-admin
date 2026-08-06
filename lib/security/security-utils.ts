import { SecurityRole } from "@/types/security";

export function isSuperAdmin(
  role: SecurityRole
) {
  return role === SecurityRole.SUPER_ADMIN;
}

export function isVendor(
  role: SecurityRole
) {
  return role === SecurityRole.VENDOR;
}

export function isDriver(
  role: SecurityRole
) {
  return role === SecurityRole.DRIVER;
}

export function isCustomer(
  role: SecurityRole
) {
  return role === SecurityRole.CUSTOMER;
}

export function isCorporate(
  role: SecurityRole
) {
  return (
    role === SecurityRole.CORPORATE_ADMIN ||
    role ===
      SecurityRole.CORPORATE_EMPLOYEE
  );
}

export function maskEmail(
  email: string
) {
  const [name, domain] = email.split("@");

  if (!name || !domain) return email;

  return (
    name.slice(0, 2) +
    "***@" +
    domain
  );
}

export function maskMobile(
  mobile: string
) {
  if (mobile.length < 4) return mobile;

  return (
    "*".repeat(mobile.length - 4) +
    mobile.slice(-4)
  );
}

export function isStrongPassword(
  password: string
) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(
    password
  );
}
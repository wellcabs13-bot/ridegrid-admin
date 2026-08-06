/**
 * RideGrid Enterprise Platform
 * Security Types
 * Version: 1.0
 */

export enum SecurityRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  OPERATIONS = "OPERATIONS",
  FINANCE = "FINANCE",
  VENDOR = "VENDOR",
  DRIVER = "DRIVER",
  CUSTOMER = "CUSTOMER",
  CORPORATE_ADMIN = "CORPORATE_ADMIN",
  CORPORATE_EMPLOYEE = "CORPORATE_EMPLOYEE",
}

export enum PermissionAction {
  VIEW = "VIEW",
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
  EXPORT = "EXPORT",
  IMPORT = "IMPORT",
  APPROVE = "APPROVE",
  ASSIGN = "ASSIGN",
  MANAGE = "MANAGE",
}

export enum SecurityStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  BLOCKED = "BLOCKED",
  LOCKED = "LOCKED",
}

export enum SessionStatus {
  ACTIVE = "ACTIVE",
  EXPIRED = "EXPIRED",
  TERMINATED = "TERMINATED",
}

export enum AuditSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export interface Permission {
  id: string;

  module: string;

  action: PermissionAction;

  name: string;

  description: string;
}

export interface RolePermission {
  role: SecurityRole;

  permissions: Permission[];
}

export interface UserSession {
  id: string;

  userId: string;

  role: SecurityRole;

  device: string;

  browser: string;

  ipAddress: string;

  location?: string;

  loginAt: Date;

  lastActivity: Date;

  status: SessionStatus;
}

export interface AuditLog {
  id: string;

  module: string;

  action: string;

  performedBy: string;

  role: SecurityRole;

  entityId?: string;

  ipAddress: string;

  userAgent?: string;

  severity: AuditSeverity;

  createdAt: Date;
}

export interface SecurityAlert {
  id: string;

  title: string;

  description: string;

  severity: AuditSeverity;

  resolved: boolean;

  createdAt: Date;
}

export interface LoginHistory {
  id: string;

  userId: string;

  email: string;

  role: SecurityRole;

  ipAddress: string;

  browser: string;

  device: string;

  success: boolean;

  loginAt: Date;
}

export interface PasswordPolicy {
  minimumLength: number;

  requireUppercase: boolean;

  requireLowercase: boolean;

  requireNumber: boolean;

  requireSpecialCharacter: boolean;

  expiryDays: number;
}

export interface TwoFactorSettings {
  enabled: boolean;

  provider: "EMAIL" | "SMS" | "AUTHENTICATOR";

  backupCodes: string[];
}

export interface SecurityConfiguration {
  passwordPolicy: PasswordPolicy;

  twoFactor: TwoFactorSettings;

  sessionTimeout: number;

  maxLoginAttempts: number;

  accountLockDuration: number;
}
export enum AutomationTrigger {
  BOOKING_CREATED = "BOOKING_CREATED",
  BOOKING_UPDATED = "BOOKING_UPDATED",
  BOOKING_CANCELLED = "BOOKING_CANCELLED",

  CUSTOMER_CREATED = "CUSTOMER_CREATED",

  DRIVER_ASSIGNED = "DRIVER_ASSIGNED",

  VENDOR_APPROVED = "VENDOR_APPROVED",

  PAYMENT_RECEIVED = "PAYMENT_RECEIVED",
  REFUND_DUE = "REFUND_DUE",

  TRIP_COMPLETED = "TRIP_COMPLETED",

  CORPORATE_APPROVAL_REQUIRED = "CORPORATE_APPROVAL_REQUIRED",
  CORPORATE_APPROVED = "CORPORATE_APPROVED",
  CORPORATE_REJECTED = "CORPORATE_REJECTED",

  DOCUMENT_EXPIRY = "DOCUMENT_EXPIRY",

  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",

  MANUAL = "MANUAL",
}

export enum AutomationStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  DRAFT = "DRAFT",
}

export enum AutomationAction {
  SEND_EMAIL = "SEND_EMAIL",
  SEND_SMS = "SEND_SMS",
  SEND_WHATSAPP = "SEND_WHATSAPP",
  SEND_PUSH = "SEND_PUSH",

  CREATE_NOTIFICATION = "CREATE_NOTIFICATION",

  UPDATE_BOOKING = "UPDATE_BOOKING",

  ASSIGN_DRIVER = "ASSIGN_DRIVER",

  GENERATE_REPORT = "GENERATE_REPORT",

  RUN_AI = "RUN_AI",
}

// Who receives an in-app notification created by a rule.
export type AutomationRecipient =
  | "TRAVELLER"
  | "VENDOR"
  | "DRIVER"
  | "CORPORATE_APPROVERS"
  | "FINANCE_TEAM";

// What the Automation dashboard reports for a rule:
// ACTIVE - subscribed to its event and able to run; DISABLED - switched off by an admin;
// NOT_CONFIGURED - needs a provider or scheduler that does not exist yet;
// FAILED - its most recent execution failed and has not been recovered.
export type AutomationRuntimeStatus =
  | "ACTIVE"
  | "DISABLED"
  | "NOT_CONFIGURED"
  | "FAILED";

export interface AutomationRule {
  id: string;
  name: string;
  description: string;

  trigger: AutomationTrigger;

  action: AutomationAction;

  status: AutomationStatus;

  enabled: boolean;

  createdAt: Date;

  updatedAt: Date;

  recipient?: AutomationRecipient;

  // Set when the rule cannot run until an external dependency exists.
  requires?: string;
}

export interface AutomationExecution {
  id: string;

  ruleId: string;

  startedAt: Date;

  completedAt?: Date;

  success: boolean;

  message?: string;
}

export interface AutomationLog {
  id: string;

  ruleName: string;

  trigger: AutomationTrigger;

  action: AutomationAction;

  executedAt: Date;

  status: "SUCCESS" | "FAILED";
}
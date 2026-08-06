export enum AutomationTrigger {
  BOOKING_CREATED = "BOOKING_CREATED",
  BOOKING_UPDATED = "BOOKING_UPDATED",
  BOOKING_CANCELLED = "BOOKING_CANCELLED",

  CUSTOMER_CREATED = "CUSTOMER_CREATED",

  DRIVER_ASSIGNED = "DRIVER_ASSIGNED",

  VENDOR_APPROVED = "VENDOR_APPROVED",

  PAYMENT_RECEIVED = "PAYMENT_RECEIVED",

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
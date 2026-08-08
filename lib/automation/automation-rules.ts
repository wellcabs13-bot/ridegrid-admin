import {
  AutomationAction,
  AutomationRule,
  AutomationStatus,
  AutomationTrigger,
} from "@/types/automation";

export const automationRules: AutomationRule[] = [
  {
    id: "AUTO-001",
    name: "Booking Confirmation",
    description:
      "Create a booking confirmation notification after a booking is created.",
    trigger:
      AutomationTrigger.BOOKING_CREATED,
    action:
      AutomationAction.SEND_EMAIL,
    status:
      AutomationStatus.ACTIVE,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  {
    id: "AUTO-002",
    name: "Driver Assignment",
    description:
      "Process the automatic driver-assignment workflow after booking creation.",
    trigger:
      AutomationTrigger.BOOKING_CREATED,
    action:
      AutomationAction.ASSIGN_DRIVER,
    status:
      AutomationStatus.ACTIVE,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  {
    id: "AUTO-003",
    name: "Document Expiry Reminder",
    description:
      "Create a WhatsApp notification for document expiry events.",
    trigger:
      AutomationTrigger.DOCUMENT_EXPIRY,
    action:
      AutomationAction.SEND_WHATSAPP,
    status:
      AutomationStatus.ACTIVE,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  {
    id: "AUTO-004",
    name: "Payment Notification",
    description:
      "Create a notification after payment is received.",
    trigger:
      AutomationTrigger.PAYMENT_RECEIVED,
    action:
      AutomationAction.CREATE_NOTIFICATION,
    status:
      AutomationStatus.ACTIVE,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  {
    id: "AUTO-005",
    name: "Daily Operations",
    description:
      "Execute daily operational automation.",
    trigger:
      AutomationTrigger.DAILY,
    action:
      AutomationAction.GENERATE_REPORT,
    status:
      AutomationStatus.ACTIVE,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export function getAutomationRules(
  trigger?: AutomationTrigger
): AutomationRule[] {
  return automationRules.filter(
    (rule) =>
      rule.enabled &&
      rule.status === AutomationStatus.ACTIVE &&
      (!trigger ||
        rule.trigger === trigger)
  );
}

export function getAutomationRuleById(
  id: string
): AutomationRule | undefined {
  return automationRules.find(
    (rule) => rule.id === id
  );
}
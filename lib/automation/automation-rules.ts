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
      "Send confirmation after booking creation.",

    trigger: AutomationTrigger.BOOKING_CREATED,

    action: AutomationAction.SEND_EMAIL,

    status: AutomationStatus.ACTIVE,

    enabled: true,

    createdAt: new Date(),

    updatedAt: new Date(),
  },

  {
    id: "AUTO-002",

    name: "Assign Driver",

    description:
      "Automatically assign available driver.",

    trigger: AutomationTrigger.BOOKING_CREATED,

    action: AutomationAction.ASSIGN_DRIVER,

    status: AutomationStatus.ACTIVE,

    enabled: true,

    createdAt: new Date(),

    updatedAt: new Date(),
  },

  {
    id: "AUTO-003",

    name: "Expiry Reminder",

    description:
      "Notify vendor before document expiry.",

    trigger: AutomationTrigger.DOCUMENT_EXPIRY,

    action: AutomationAction.SEND_WHATSAPP,

    status: AutomationStatus.ACTIVE,

    enabled: true,

    createdAt: new Date(),

    updatedAt: new Date(),
  },
];
import {
  AutomationAction,
  AutomationRecipient,
  AutomationRule,
  AutomationStatus,
  AutomationTrigger,
} from "@/types/automation";
import { emailReady } from "@/lib/notifications/channels";

// The registry of RideGrid's internal automations. Every rule with status ACTIVE and
// no `requires` is executed by the AutomationEngine whenever the central dispatcher
// (lib/events/event-dispatcher.ts) processes an event with the rule's trigger.
// Rules that need an external provider or a scheduler declare it in `requires`;
// they are reported as NOT_CONFIGURED and never selected for execution.

export type NotificationTemplateInput = {
  ref: string;
  pickup: string | null;
  metadata: Record<string, unknown>;
};

export type AutomationRuleDefinition = AutomationRule & {
  template?: (input: NotificationTemplateInput) => { title: string; message: string };
  // SEND_EMAIL rules: subject and plain-text body. Delivered through the EmailProvider.
  email?: (input: NotificationTemplateInput) => { subject: string; text: string };
};

// Email rules can run only while the email provider is configured; otherwise they
// report NOT_CONFIGURED and are never selected. Other dependencies are static.
export function ruleRequirement(rule: AutomationRuleDefinition): string | null {
  if (rule.requires) return rule.requires;
  if (rule.action === AutomationAction.SEND_EMAIL && !emailReady()) return "Email provider (Zoho CPaaS) not configured";
  return null;
}

const HELP = "Need help? Reply to this email, write to service@wellcabs.com or call +91 90110 79304.";
const APP = "Open the RideGrid app for the car, driver and trip details.";

const RULES_VERSION_DATE = new Date("2026-09-28T00:00:00.000Z");

function rule(
  id: string,
  name: string,
  description: string,
  trigger: AutomationTrigger,
  action: AutomationAction,
  extra: Partial<AutomationRuleDefinition> & { recipient?: AutomationRecipient } = {}
): AutomationRuleDefinition {
  return {
    id, name, description, trigger, action,
    status: AutomationStatus.ACTIVE,
    enabled: true,
    createdAt: RULES_VERSION_DATE,
    updatedAt: RULES_VERSION_DATE,
    ...extra,
  };
}

const at = (pickup: string | null) => (pickup ? ` for pickup on ${pickup}` : "");

export const automationRules: AutomationRuleDefinition[] = [
  rule("AUTO-001", "Booking confirmation", "In-app confirmation to the traveller when a booking is confirmed.",
    AutomationTrigger.BOOKING_CREATED, AutomationAction.CREATE_NOTIFICATION, {
      recipient: "TRAVELLER",
      template: ({ ref }) => ({ title: "Booking confirmed", message: `${ref} is confirmed. Open My Trips for details.` }),
    }),
  rule("AUTO-002", "New booking alert to vendor", "In-app alert to the vendor that owns the booked vehicle.",
    AutomationTrigger.BOOKING_CREATED, AutomationAction.CREATE_NOTIFICATION, {
      recipient: "VENDOR",
      template: ({ ref, pickup }) => ({ title: "New confirmed booking", message: `${ref} is confirmed${at(pickup)}. Open Bookings for trip details.` }),
    }),
  rule("AUTO-003", "Trip assignment alert to driver", "In-app alert to the driver assigned to the booked vehicle.",
    AutomationTrigger.BOOKING_CREATED, AutomationAction.CREATE_NOTIFICATION, {
      recipient: "DRIVER",
      template: ({ ref, pickup }) => ({ title: "Trip assigned to you", message: `${ref}${at(pickup)}. Refresh My Trips for current details.` }),
    }),
  rule("AUTO-004", "Payment receipt", "In-app receipt to the customer once PayU payment is verified.",
    AutomationTrigger.PAYMENT_RECEIVED, AutomationAction.CREATE_NOTIFICATION, {
      recipient: "TRAVELLER",
      template: ({ ref }) => ({ title: "Payment received", message: `Payment for ${ref} has been received.` }),
    }),
  rule("AUTO-005", "Cancellation notice to traveller", "In-app notice to the traveller when a booking is cancelled.",
    AutomationTrigger.BOOKING_CANCELLED, AutomationAction.CREATE_NOTIFICATION, {
      recipient: "TRAVELLER",
      template: ({ ref }) => ({ title: "Booking cancelled", message: `${ref} has been cancelled. Any refund due is processed to the original payment method.` }),
    }),
  rule("AUTO-006", "Cancellation alert to vendor", "In-app alert to the vendor when one of their bookings is cancelled.",
    AutomationTrigger.BOOKING_CANCELLED, AutomationAction.CREATE_NOTIFICATION, {
      recipient: "VENDOR",
      template: ({ ref }) => ({ title: "Booking cancelled", message: `${ref} has been cancelled. The vehicle and driver are released for those dates.` }),
    }),
  rule("AUTO-007", "Refund due alert to Finance", "In-app alert to Super Admin and Finance users when a cancellation leaves an online refund due.",
    AutomationTrigger.REFUND_DUE, AutomationAction.CREATE_NOTIFICATION, {
      recipient: "FINANCE_TEAM",
      template: ({ ref, metadata }) => ({
        title: "Refund due",
        message: `${ref} was cancelled after payment.${typeof metadata.refundAmount === "number" ? ` A refund of ₹${metadata.refundAmount.toLocaleString("en-IN")}` : " A refund"} is due. Process it in Finance → Refunds.`,
      }),
    }),
  rule("AUTO-008", "Driver change notice", "In-app notice to the traveller when the booking's driver is changed.",
    AutomationTrigger.DRIVER_ASSIGNED, AutomationAction.CREATE_NOTIFICATION, {
      recipient: "TRAVELLER",
      template: ({ ref }) => ({ title: "Driver updated", message: `The driver for ${ref} has been updated. Open My Trips for details.` }),
    }),
  rule("AUTO-009", "Approval request receipt", "In-app confirmation to the employee that their ride request awaits company approval.",
    AutomationTrigger.CORPORATE_APPROVAL_REQUIRED, AutomationAction.CREATE_NOTIFICATION, {
      recipient: "TRAVELLER",
      template: ({ pickup }) => ({ title: "Approval requested", message: `Your ride request${pickup ? ` for ${pickup}` : ""} is awaiting company approval.` }),
    }),
  rule("AUTO-010", "Approval required alert to approvers", "In-app alert to the company's active Corporate Administrators.",
    AutomationTrigger.CORPORATE_APPROVAL_REQUIRED, AutomationAction.CREATE_NOTIFICATION, {
      recipient: "CORPORATE_APPROVERS",
      template: ({ pickup }) => ({ title: "Travel approval required", message: `A ride request${pickup ? ` for ${pickup}` : ""} is awaiting your decision.` }),
    }),
  rule("AUTO-011", "Approval granted notice", "In-app notice to the employee; the next step is booking the approved ride at a fresh price.",
    AutomationTrigger.CORPORATE_APPROVED, AutomationAction.CREATE_NOTIFICATION, {
      recipient: "TRAVELLER",
      template: () => ({ title: "Ride request approved", message: "Your ride request was approved. Open Approvals to confirm the booking at a fresh price." }),
    }),
  rule("AUTO-012", "Approval rejected notice", "In-app notice to the employee with the approver's reason.",
    AutomationTrigger.CORPORATE_REJECTED, AutomationAction.CREATE_NOTIFICATION, {
      recipient: "TRAVELLER",
      template: ({ metadata }) => ({ title: "Ride request rejected", message: `Your ride request was not approved.${typeof metadata.remarks === "string" && metadata.remarks ? ` Note: ${metadata.remarks}` : ""}` }),
    }),
  rule("AUTO-013", "Vendor verified notice", "In-app notice to the vendor when the Super Admin verifies their account.",
    AutomationTrigger.VENDOR_APPROVED, AutomationAction.CREATE_NOTIFICATION, {
      recipient: "VENDOR",
      template: () => ({ title: "Account verified", message: "Your RideGrid vendor account is verified. Your approved vehicles can now appear in the marketplace." }),
    }),

  // Email copies through the EmailProvider (Zoho CPaaS). Active only when configured.
  rule("AUTO-014", "Booking confirmation email", "Email copy of the booking confirmation to the traveller.",
    AutomationTrigger.BOOKING_CREATED, AutomationAction.SEND_EMAIL, {
      recipient: "TRAVELLER",
      email: ({ ref, pickup }) => ({ subject: `Booking confirmed: ${ref}`, text: `Your RideGrid booking ${ref} is confirmed${at(pickup)}.\n\n${APP}\n\n${HELP}` }),
    }),
  rule("AUTO-017", "Payment confirmation email", "Email receipt to the customer once PayU payment is verified.",
    AutomationTrigger.PAYMENT_RECEIVED, AutomationAction.SEND_EMAIL, {
      recipient: "TRAVELLER",
      email: ({ ref }) => ({ subject: `Payment received: ${ref}`, text: `We have received your payment for booking ${ref}. Your tax invoice will be available from the RideGrid app once the trip is complete.\n\n${HELP}` }),
    }),
  rule("AUTO-018", "Driver assignment email", "Email to the traveller when the booking's driver is assigned or changed.",
    AutomationTrigger.DRIVER_ASSIGNED, AutomationAction.SEND_EMAIL, {
      recipient: "TRAVELLER",
      email: ({ ref }) => ({ subject: `Driver assigned: ${ref}`, text: `A driver has been assigned to your booking ${ref}. The driver's name and contact are shown in the RideGrid app closer to pickup.\n\n${HELP}` }),
    }),
  rule("AUTO-019", "Cancellation email", "Email to the traveller when a booking is cancelled.",
    AutomationTrigger.BOOKING_CANCELLED, AutomationAction.SEND_EMAIL, {
      recipient: "TRAVELLER",
      email: ({ ref }) => ({ subject: `Booking cancelled: ${ref}`, text: `Your RideGrid booking ${ref} has been cancelled. Any refund due is returned to the original payment method; we will write again once it is processed.\n\n${HELP}` }),
    }),
  rule("AUTO-020", "Refund in progress email", "Email to the customer when a cancellation leaves an online payment to refund.",
    AutomationTrigger.REFUND_DUE, AutomationAction.SEND_EMAIL, {
      recipient: "TRAVELLER",
      email: ({ ref }) => ({ subject: `Refund in progress: ${ref}`, text: `A refund is due for your cancelled booking ${ref}. It is being processed to your original payment method; banks usually take 5-7 working days to credit it.\n\n${HELP}` }),
    }),
  rule("AUTO-021", "Trip completed email", "Email to the traveller when the trip is completed.",
    AutomationTrigger.TRIP_COMPLETED, AutomationAction.SEND_EMAIL, {
      recipient: "TRAVELLER",
      email: ({ ref }) => ({ subject: `Trip completed: ${ref}`, text: `Your trip ${ref} is complete. Thank you for travelling with Wellcabs.\n\nYou can rate the trip and view the booking in the RideGrid app.\n\n${HELP}` }),
    }),
  rule("AUTO-022", "Approval required email", "Email to the company's Corporate Administrators and assigned approver.",
    AutomationTrigger.CORPORATE_APPROVAL_REQUIRED, AutomationAction.SEND_EMAIL, {
      recipient: "CORPORATE_APPROVERS",
      email: ({ pickup }) => ({ subject: "Travel approval required", text: `A ride request${pickup ? ` for ${pickup}` : ""} is awaiting your decision.\n\nReview it in the RideGrid Corporate Portal under Approvals, or in the RideGrid Corporate app.\n\n${HELP}` }),
    }),
  rule("AUTO-023", "Approval granted email", "Email to the employee when their ride request is approved.",
    AutomationTrigger.CORPORATE_APPROVED, AutomationAction.SEND_EMAIL, {
      recipient: "TRAVELLER",
      email: () => ({ subject: "Ride request approved", text: `Your ride request was approved. Open Approvals in the RideGrid Corporate app to confirm the booking at a fresh price.\n\n${HELP}` }),
    }),
  rule("AUTO-024", "Approval rejected email", "Email to the employee when their ride request is rejected.",
    AutomationTrigger.CORPORATE_REJECTED, AutomationAction.SEND_EMAIL, {
      recipient: "TRAVELLER",
      email: ({ metadata }) => ({ subject: "Ride request not approved", text: `Your ride request was not approved.${typeof metadata.remarks === "string" && metadata.remarks ? `\n\nApprover's note: ${metadata.remarks.slice(0, 500)}` : ""}\n\n${HELP}` }),
    }),
  rule("AUTO-025", "Vendor verified email", "Email to the vendor when the Super Admin verifies their account.",
    AutomationTrigger.VENDOR_APPROVED, AutomationAction.SEND_EMAIL, {
      recipient: "VENDOR",
      email: () => ({ subject: "Your RideGrid vendor account is verified", text: `Your RideGrid vendor account is verified. Your approved vehicles can now appear in the RideGrid marketplace.\n\n${HELP}` }),
    }),

  // Declared but dependent on integrations that are not live yet.
  rule("AUTO-015", "Document expiry reminder", "WhatsApp reminder before a vendor or driver document expires.",
    AutomationTrigger.DOCUMENT_EXPIRY, AutomationAction.SEND_WHATSAPP, { requires: "WhatsApp provider and a document-expiry scheduler (neither configured)" }),
  rule("AUTO-016", "Daily operations report", "Scheduled daily operations summary.",
    AutomationTrigger.DAILY, AutomationAction.GENERATE_REPORT, { requires: "Scheduler / cron runner (not configured)" }),
];

// Rules able to run on their own: active, enabled by default and without a missing
// dependency. Admin on/off overrides are applied by the engine at execution time.
export function getAutomationRules(
  trigger?: AutomationTrigger
): AutomationRuleDefinition[] {
  return automationRules.filter(
    (rule) =>
      rule.enabled &&
      rule.status === AutomationStatus.ACTIVE &&
      !ruleRequirement(rule) &&
      (!trigger ||
        rule.trigger === trigger)
  );
}

export function getAutomationRuleById(
  id: string
): AutomationRuleDefinition | undefined {
  return automationRules.find(
    (rule) => rule.id === id
  );
}

export const ruleSettingKey = (id: string) => `automation.rule.${id}.enabled`;
export const RULE_SETTING_PREFIX = "automation.rule.";

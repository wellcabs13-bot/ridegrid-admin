import { automationView, channelStatus } from "@/lib/services/admin/PlatformAdminService";

// Corporate view of the central event -> automation -> notification pipeline. Nothing
// here sends anything: it reports, per corporate event, which central automation rule
// delivers it and the real state of every channel. External providers (email, SMS,
// WhatsApp) and device push report the real provider configuration.
type ChannelState = "ACTIVE" | "DISABLED" | "NOT_CONFIGURED" | "FAILED";

const EVENTS: { key: string; label: string; audience: string; rules: string[]; emailRule?: string; note?: string }[] = [
  { key: "APPROVAL_REQUIRED", label: "Approval required", audience: "Corporate administrators and the step's assigned approver", rules: ["AUTO-010"], emailRule: "AUTO-022" },
  { key: "APPROVAL_SUBMITTED", label: "Approval request received", audience: "Requesting employee", rules: ["AUTO-009"] },
  { key: "APPROVED", label: "Request approved", audience: "Requesting employee", rules: ["AUTO-011"], emailRule: "AUTO-023" },
  { key: "REJECTED", label: "Request rejected", audience: "Requesting employee", rules: ["AUTO-012"], emailRule: "AUTO-024" },
  { key: "BOOKING_CONFIRMED", label: "Booking confirmed", audience: "Traveller, vendor and driver", rules: ["AUTO-001", "AUTO-002", "AUTO-003"], emailRule: "AUTO-014" },
  { key: "BOOKING_CANCELLED", label: "Booking cancelled", audience: "Traveller and vendor", rules: ["AUTO-005", "AUTO-006"], emailRule: "AUTO-019" },
  { key: "DRIVER_ASSIGNED", label: "Driver assigned / changed", audience: "Traveller", rules: ["AUTO-008"], emailRule: "AUTO-018" },
  { key: "TRIP_REMINDER", label: "Trip reminder", audience: "Traveller", rules: [], note: "Needs a scheduler, which is not configured." },
  { key: "TRIP_COMPLETED", label: "Trip completed", audience: "Corporate administrators", rules: [], note: "No automation rule exists yet; completed trips appear on Bookings and Billing." },
  { key: "INVOICE_GENERATED", label: "Invoice generated", audience: "Corporate administrators", rules: [], note: "Invoices are issued by RideGrid Finance; no alert rule exists yet." },
  { key: "PAYMENT_DUE", label: "Payment due", audience: "Corporate administrators", rules: [], note: "Needs a scheduler, which is not configured." },
  { key: "OUTSTANDING", label: "Outstanding balance", audience: "Corporate administrators", rules: [], note: "Needs a scheduler, which is not configured." },
  { key: "CREDIT_ALERT", label: "Corporate credit alert", audience: "Corporate administrators", rules: [], note: "No automation rule exists yet; see Billing for live credit." },
];

export async function notificationCenter() {
  const [auto, channels] = await Promise.all([automationView().catch(() => null), Promise.resolve(channelStatus())]);
  const ruleState = new Map((auto?.rules ?? []).map((r) => [r.id, r.status as ChannelState]));
  const provider = (channel: string) => (channels.find((c) => c.channel === channel)?.status ?? "NOT_CONFIGURED") as ChannelState;
  const combine = (states: ChannelState[]): ChannelState => !states.length ? "NOT_CONFIGURED"
    : states.includes("FAILED") ? "FAILED" : states.includes("ACTIVE") ? "ACTIVE" : states.includes("DISABLED") ? "DISABLED" : "NOT_CONFIGURED";
  return {
    channels: [
      { channel: "IN_APP", label: "In-app", status: provider("IN_APP"), detail: "Central notification inbox shown in this portal and the RideGrid apps." },
      { channel: "PUSH", label: "Push", status: provider("DEVICE_PUSH"), detail: provider("DEVICE_PUSH") === "ACTIVE" ? "In-app notifications are also sent to signed-in RideGrid app devices." : "Device push is not configured yet; apps read the in-app inbox." },
      { channel: "EMAIL", label: "Email", status: provider("EMAIL"), detail: provider("EMAIL") === "ACTIVE" ? "Sent from service@wellcabs.com for the events marked below." : "Email delivery is not configured yet." },
      { channel: "SMS", label: "SMS", status: provider("SMS"), detail: "SMS delivery is not available in this version." },
      { channel: "WHATSAPP", label: "WhatsApp", status: provider("WHATSAPP"), detail: "WhatsApp delivery is not available in this version." },
    ],
    events: EVENTS.map((e) => {
      const inApp = auto ? combine(e.rules.map((id) => ruleState.get(id) ?? "NOT_CONFIGURED")) : (e.rules.length ? "ACTIVE" : "NOT_CONFIGURED");
      return {
        key: e.key, label: e.label, audience: e.audience, note: e.note ?? null,
        channels: {
          IN_APP: inApp,
          PUSH: provider("DEVICE_PUSH") === "ACTIVE" && e.rules.length ? inApp : "NOT_CONFIGURED",
          EMAIL: e.emailRule ? ruleState.get(e.emailRule) ?? "NOT_CONFIGURED" : "NOT_CONFIGURED",
          SMS: "NOT_CONFIGURED" as ChannelState,
          WHATSAPP: "NOT_CONFIGURED" as ChannelState,
        },
      };
    }),
  };
}

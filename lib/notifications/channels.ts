import "server-only";

// Readiness of the external notification channels, derived only from server-side
// configuration. A channel is ACTIVE only when everything it needs is configured;
// code existing is never enough. Secret values are read here and never returned.

export type ChannelState = "ACTIVE" | "NOT_CONFIGURED";

const env = (key: string) => (process.env[key] ?? "").trim();

// ---------- Email (Zoho CPaaS) ----------

export const ZOHO_EMAIL_DEFAULT_URL = "https://cpaas.zoho.com/v1.1/email";
const SENDER_DOMAIN = "wellcabs.com";
const EMAIL = /^[^\s@<>()",;]+@[^\s@<>()",;]+\.[^\s@<>()",;]+$/;

export type EmailConfig = { apiUrl: string; apiKey: string; fromAddress: string; fromName: string; replyTo: string | null };

// Returns the configuration, or the reason email is not configured.
export function emailConfig(): { ok: true; config: EmailConfig } | { ok: false; reason: string } {
  const apiKey = env("ZOHO_CPAAS_EMAIL_API_KEY");
  const fromAddress = env("EMAIL_FROM_ADDRESS").toLowerCase();
  const fromName = env("EMAIL_FROM_NAME") || "RideGrid by Wellcabs";
  const apiUrl = env("ZOHO_CPAAS_EMAIL_API_URL") || ZOHO_EMAIL_DEFAULT_URL;
  const replyTo = env("EMAIL_REPLY_TO").toLowerCase() || null;
  if (!apiKey) return { ok: false, reason: "ZOHO_CPAAS_EMAIL_API_KEY is not set." };
  if (!fromAddress) return { ok: false, reason: "EMAIL_FROM_ADDRESS is not set." };
  // Production sender validation: only the verified wellcabs.com domain may send.
  if (!EMAIL.test(fromAddress) || !fromAddress.endsWith(`@${SENDER_DOMAIN}`)) return { ok: false, reason: `EMAIL_FROM_ADDRESS must be an address on ${SENDER_DOMAIN}.` };
  if (replyTo && !EMAIL.test(replyTo)) return { ok: false, reason: "EMAIL_REPLY_TO is not a valid address." };
  let url: URL;
  try { url = new URL(apiUrl); } catch { return { ok: false, reason: "ZOHO_CPAAS_EMAIL_API_URL is not a valid URL." }; }
  if (url.protocol !== "https:" || !/(^|\.)zoho\.(com|in|eu|com\.au|jp|com\.cn|sa|ca)$/.test(url.hostname)) return { ok: false, reason: "ZOHO_CPAAS_EMAIL_API_URL must be an https Zoho endpoint." };
  return { ok: true, config: { apiUrl: url.toString(), apiKey, fromAddress, fromName, replyTo } };
}

export const emailReady = () => emailConfig().ok;

export const isEmailAddress = (value: string | null | undefined): value is string => !!value && value.length <= 254 && EMAIL.test(value);

// ---------- Device push (Expo Push Service → FCM) ----------

// Expo delivers to Android through FCM using the FCM V1 service-account key that is
// uploaded to EAS for each app. That upload cannot be verified from this server, so
// the operator confirms it with PUSH_NOTIFICATIONS_ENABLED=true once all four apps
// have credentials. EXPO_ACCESS_TOKEN is sent when set (required if "Enhanced
// security for push notifications" is enabled on the Expo account).
export function pushConfig(): { ok: true; accessToken: string | null } | { ok: false; reason: string } {
  if (env("PUSH_NOTIFICATIONS_ENABLED").toLowerCase() !== "true")
    return { ok: false, reason: "PUSH_NOTIFICATIONS_ENABLED is not true (FCM credentials not confirmed in EAS)." };
  return { ok: true, accessToken: env("EXPO_ACCESS_TOKEN") || null };
}

export const pushReady = () => pushConfig().ok;

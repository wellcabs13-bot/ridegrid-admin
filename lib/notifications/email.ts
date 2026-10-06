import "server-only";
import { prisma } from "@/lib/prisma";
import { emailConfig, isEmailAddress } from "./channels";

// EmailProvider: the only place RideGrid sends email. Automation rules call it; no
// booking or payment code sends email directly. The Zoho CPaaS Send API key stays
// on the server and is never logged, stored or returned.

export type EmailMessage = { to: { address: string; name?: string }; subject: string; text: string; reference?: string };

export type EmailResult =
  | { status: "SENT"; providerRequestId: string | null }
  | { status: "NOT_CONFIGURED"; reason: string }
  | { status: "INVALID_RECIPIENT" }
  | { status: "FAILED"; error: string; retryable: boolean };

export interface EmailProvider {
  send(message: EmailMessage): Promise<EmailResult>;
}

const TIMEOUT_MS = 8000;

// Provider text is reduced to a short code/message; addresses, keys and bodies are
// never echoed into logs or the automation dashboard.
export function sanitizeProviderError(status: number, body: unknown, secrets: string[] = []): string {
  const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const detail = (data.error && typeof data.error === "object" ? data.error : data.data && typeof data.data === "object" && !Array.isArray(data.data) ? data.data : data) as Record<string, unknown>;
  const code = typeof detail.code === "string" ? detail.code : typeof detail.error_code === "string" ? detail.error_code : null;
  const message = typeof detail.message === "string" ? detail.message : null;
  const clean = (v: string) => {
    let out = v.replace(/[^\s@]+@[^\s@]+/g, "[address]");
    for (const secret of secrets) if (secret) out = out.split(secret).join("[redacted]");
    return out.replace(/[^\w .:[\]-]/g, "").slice(0, 80);
  };
  return [`HTTP ${status}`, code && clean(code), message && clean(message)].filter(Boolean).join(" ");
}

const escapeHtml = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// Plain, professional layout. Content is escaped; there are no remote images or trackers.
export function renderEmailHtml(subject: string, text: string) {
  const linkify = (v: string) => v.replace(/https:\/\/[^\s<]+/g, (u) => `<a href="${u}" style="color:#b91c1c">${u}</a>`);
  const paragraphs = text.split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px">${linkify(escapeHtml(p)).replace(/\n/g, "<br>")}</p>`).join("");
  return `<!doctype html><html><body style="margin:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#1f1f1f">`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px">`
    + `<tr><td style="padding:20px 24px;border-bottom:3px solid #b91c1c;font-size:18px;font-weight:bold">RideGrid by Wellcabs</td></tr>`
    + `<tr><td style="padding:24px;font-size:15px;line-height:1.5"><h1 style="font-size:18px;margin:0 0 16px">${escapeHtml(subject)}</h1>${paragraphs}</td></tr>`
    + `<tr><td style="padding:16px 24px;border-top:1px solid #eeeeee;font-size:12px;color:#666666">Wellcabs · service@wellcabs.com · +91 90110 79304<br>This is a service message about your RideGrid account or trips.</td></tr>`
    + `</table></td></tr></table></body></html>`;
}

export class ZohoCpaasEmailProvider implements EmailProvider {
  constructor(private readonly fetchImpl?: typeof fetch) {}

  async send(message: EmailMessage): Promise<EmailResult> {
    const cfg = emailConfig();
    if (!cfg.ok) return { status: "NOT_CONFIGURED", reason: cfg.reason };
    if (!isEmailAddress(message.to.address)) return { status: "INVALID_RECIPIENT" };
    const { apiUrl, apiKey, fromAddress, fromName, replyTo } = cfg.config;
    const body = {
      from: { address: fromAddress, name: fromName },
      to: [{ email_address: { address: message.to.address, ...(message.to.name ? { name: message.to.name.slice(0, 100) } : {}) } }],
      ...(replyTo ? { reply_to: [{ address: replyTo }] } : {}),
      subject: message.subject.slice(0, 200),
      textbody: message.text,
      htmlbody: renderEmailHtml(message.subject, message.text),
      ...(message.reference ? { client_reference: message.reference.slice(0, 100) } : {}),
      track_opens: false,
      track_clicks: false,
    };
    try {
      const res = await (this.fetchImpl ?? globalThis.fetch)(apiUrl, {
        method: "POST",
        headers: { Authorization: `Zoho-enczapikey ${apiKey}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const json = await res.json().catch(() => null);
      if (res.ok) return { status: "SENT", providerRequestId: json && typeof json.request_id === "string" ? json.request_id.slice(0, 100) : null };
      return { status: "FAILED", error: sanitizeProviderError(res.status, json, [apiKey]), retryable: res.status === 429 || res.status >= 500 };
    } catch (error) {
      const timeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
      return { status: "FAILED", error: timeout ? "Email provider timed out." : "Email provider unreachable.", retryable: true };
    }
  }
}

export const emailProvider: EmailProvider = new ZohoCpaasEmailProvider();

// Records the outcome without the address or body: channel, a masked recipient,
// subject and success. Logging failure never affects delivery.
export async function logEmailResult(address: string, subject: string, result: EmailResult) {
  const [local, domain] = address.split("@");
  const masked = `${(local ?? "").slice(0, 2)}***@${domain ?? ""}`;
  try {
    await prisma.notificationLog.create({ data: { channel: "EMAIL", recipient: masked.slice(0, 120), subject: `${subject.slice(0, 150)} [${result.status}]`, success: result.status === "SENT", sentAt: new Date() } });
  } catch {
    // The delivery outcome is also reported through the automation result.
  }
}

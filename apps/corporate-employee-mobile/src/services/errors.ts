export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
// Server messages are shown only when short and free of internals; the server writes
// them for people (a policy reason, a booking conflict, why an action is refused).
// A bare code such as "PRICE_UNAVAILABLE" is never shown; known codes are explained.
const safe = (message: unknown) =>
  typeof message === "string" && message.length < 250 && !/prisma|stack|sql|exception/i.test(message) && !/^[A-Z][A-Z0-9_]+$/.test(message.trim()) ? message : undefined;
const CODES: Record<string, string> = {
  PRICE_UNAVAILABLE: "This ride is no longer available at a current price. Search again for available rides.",
  RATE_EXPIRED: "This price has expired. Search again for a current price.",
  QUOTE_REQUIRED: "Refresh your price and try again.",
  QUOTE_MISMATCH: "Trip details changed. Refresh your price and try again.",
  QUOTE_ALREADY_USED: "This price was already used for a booking. Check your trips.",
  IDEMPOTENCY_CONFLICT: "This request was already submitted. Refresh to see its status.",
  VERSION_CONFLICT: "This record changed. Refresh and try again.",
};
// `authenticated` is false for sign-in and password calls, where a 401 means the
// credentials or account were refused rather than an expired session.
export function normalizeError(
  status: number,
  body: { code?: string; message?: string } = {},
  authenticated = true,
) {
  const server = safe(body.message) || (body.code ? CODES[body.code] : undefined) || (typeof body.message === "string" ? CODES[body.message.trim()] : undefined);
  const message =
    status === 0
      ? "Unable to connect. Check your connection and retry."
      : status === 401
        ? authenticated
          ? "Your session expired. Please sign in again."
          : server || "Check your email and password and try again."
        : status >= 500
          ? "The service is temporarily unavailable. Please try again."
          : body.code === "QUOTE_EXPIRED"
            ? "Your quote expired. Refresh your price."
            : status === 403
              ? server || "This action is not permitted for your account."
              : status === 409
                ? server || "The record changed or is unavailable. Refresh and try again."
                : status === 429
                  ? server || "Too many attempts. Wait a moment and try again."
                  : server || "Please check your details and try again.";
  return new ApiError(status, body.code || "REQUEST_FAILED", message);
}
// A lost or 5xx response to a booking mutation may still have committed on the server.
export const uncertain = (e: unknown) => {
  const status = (e as { status?: number } | null)?.status;
  return status === 0 || (status !== undefined && status >= 500);
};

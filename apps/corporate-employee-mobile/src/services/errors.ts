export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}
const safe = (message: unknown) =>
  typeof message === "string" && message.length < 250 && !/prisma|stack|sql|exception/i.test(message) ? message : undefined;
export function normalizeError(status: number, body: { code?: string; message?: string } = {}) {
  const message =
    status === 401
      ? "Your session expired. Please sign in again."
      : status === 0
        ? "Unable to connect. Check your connection and retry."
        : status >= 500
          ? "The service is temporarily unavailable. Please try again."
          : body.code === "QUOTE_EXPIRED"
            ? "Your quote expired. Refresh your price."
            : safe(body.message) ||
              (status === 403
                ? "This action is not available for your account."
                : status === 409
                  ? "The record changed or is unavailable. Refresh and try again."
                  : "Please check your details and try again.");
  return new ApiError(status, body.code || "REQUEST_FAILED", message);
}
// A lost or 5xx response to a booking mutation may still have committed on the server.
export const uncertain = (e: unknown) => {
  const status = (e as { status?: number } | null)?.status;
  return status === 0 || (status !== undefined && status >= 500);
};

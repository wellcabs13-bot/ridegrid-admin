export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export function normalizeError(
  status: number,
  body: { code?: string; message?: string } = {},
) {
  const message =
    status === 401
      ? "Your session expired. Please sign in again."
      : status === 403
        ? "This action is not available for your account."
        : status === 409
          ? "This option is no longer available. Refresh your quote or search again."
          : status >= 500
            ? "The service is temporarily unavailable. Please try again."
            : body.code === "QUOTE_EXPIRED"
              ? "Your quote expired. Refresh your price."
              : status === 0
                ? "Unable to connect. Check your connection and retry."
                : body.message &&
                    body.message.length < 250 &&
                    !/prisma|stack|sql|exception/i.test(body.message)
                  ? body.message
                  : "Please check your details and try again.";
  return new ApiError(status, body.code || "REQUEST_FAILED", message);
}

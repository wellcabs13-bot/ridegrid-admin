import type { Session } from "../types";
// Only complete Corporate Employee sessions are restored or accepted after sign-in.
export function validSession(value: unknown): value is Session {
  const s = value as Session | null;
  return (
    !!s &&
    typeof s.accessToken === "string" &&
    s.accessToken.length > 0 &&
    typeof s.refreshToken === "string" &&
    s.refreshToken.length > 0 &&
    typeof s.user?.id === "string" &&
    s.user.id.length > 0 &&
    s.user.role === "CORPORATE_EMPLOYEE"
  );
}

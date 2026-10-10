export const liveActionAllowed = (online: boolean, authenticated: boolean) =>
  online && authenticated;
export function publicCacheFresh(at: unknown, now = Date.now()) {
  return typeof at === "number" && at <= now && now - at < 86400000;
}

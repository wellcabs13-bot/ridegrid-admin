import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
// An explicit capability and registration callback are required. No permission prompt
// or token generation runs until the backend has a delivery/token lifecycle.
export async function registerPush(
  enabled: boolean,
  projectId: string,
  register: (token: string) => Promise<void>,
) {
  if (!enabled || !Device.isDevice || !projectId) return false;
  const permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted") return false;
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  await register(token.data);
  return true;
}
export function bookingLink(data: Record<string, unknown>) {
  return typeof data.bookingId === "string" &&
    /^[a-zA-Z0-9_-]{1,128}$/.test(data.bookingId)
    ? `/bookings/${data.bookingId}`
    : null;
}

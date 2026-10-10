import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { api } from "../services/api";

// Device push for this app. The RideGrid server decides what is sent (it mirrors the
// in-app inbox); the app only registers its Expo token after sign-in, removes it on
// sign-out, and opens a screen on tap. A tap never changes booking or payment state:
// the opened screen re-reads everything from the server with the user's session.
const APP = "com.ridegrid.corporate";
let registered: string | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

// Called once per signed-in account. Asks for notification permission only when the
// server reports push as configured, on a real device of an EAS-linked build.
export async function enablePush(): Promise<boolean> {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (Platform.OS === "web" || !Device.isDevice || typeof projectId !== "string" || !projectId) return false;
  const config = await api<{ pushRegistration?: boolean }>("/api/mobile/config", {}, false).catch(() => null);
  if (!config?.pushRegistration) return false;
  // Android 13+ shows the permission prompt only after a channel exists.
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("default", { name: "Trip updates", importance: Notifications.AndroidImportance.HIGH });
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== "granted") return false;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await api("/api/mobile/push-devices", { method: "POST", body: JSON.stringify({ token, app: APP, platform: Platform.OS }) });
  registered = token;
  return true;
}

// The token this device registered, sent with the sign-out request so the server
// stops delivering the previous account's notifications here.
export function takePushToken() {
  const token = registered;
  registered = null;
  return token;
}

// Only a navigation hint is read from the payload, and only well-formed ids.
export function pushRoute(data: unknown) {
  const d = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const id = typeof d.bookingId === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(d.bookingId) ? d.bookingId : null;
  if (d.kind === "booking" && id) return { pathname: "/trip", params: { id } };
  if (d.kind === "approvals") return "/approvals";
  if (d.kind === "reviews") return "/reviews";
  return null;
}

// Opens the screen for a tapped notification, including the one that launched the app.
export function listenForPushTaps() {
  const open = (response: Notifications.NotificationResponse | null) => {
    const route = response ? pushRoute(response.notification.request.content.data) : null;
    if (route) router.push(route as never);
  };
  void Notifications.getLastNotificationResponseAsync().then(open).catch(() => {});
  const sub = Notifications.addNotificationResponseReceivedListener(open);
  return () => sub.remove();
}

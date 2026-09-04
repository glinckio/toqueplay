import { Platform } from "react-native";
import * as Device from "expo-device";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { notificationsService } from "@/services/notificationsService";

// Remote push (and even touching expo-notifications' token/listener APIs) was
// removed from Expo Go in SDK 53 — doing so crashes the app on load. Detect
// Expo Go and no-op everywhere below instead of importing expo-notifications
// eagerly; it's only required (and only imported) inside a real dev/prod build.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Backend relays through Expo's push service (expo-server-sdk), so the
// client registers an Expo push token — not a raw FCM/APNs device token.
// That's also what lets Android work without our own Firebase project.
const projectId = Constants.expoConfig?.extra?.eas?.projectId;

if (!isExpoGo) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Notifications = require("expo-notifications");
  // Foreground notifications still show a banner/sound instead of being silent.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (isExpoGo || !Device.isDevice) return null; // no push tokens in Expo Go or on simulators/emulators

  const Notifications = require("expo-notifications");

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== "granted") return null;

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  const platform = Platform.OS === "ios" ? "ios" : "android";
  await notificationsService.registerDeviceToken(token, platform);
  return token;
}

// Turning the Settings toggle off: read the token without re-prompting for
// permission, then tell the backend to stop sending to it.
export async function unregisterCurrentDevice() {
  if (isExpoGo || !Device.isDevice) return;

  const Notifications = require("expo-notifications");
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await notificationsService.removeDeviceToken(token).catch(() => {});
}

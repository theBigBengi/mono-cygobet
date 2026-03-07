import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { apiFetchWithAuthRetry } from "../http/apiClient";

// In-memory store for the current push token (for cleanup on logout)
let currentPushToken: string | null = null;

export function getCurrentPushToken() {
  return currentPushToken;
}

// Configure how notifications are shown when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Request notification permissions and register push token with the server.
 * Should be called once the user is authenticated.
 * Returns the Expo push token or null if registration failed.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    console.log("Push notifications require a physical device");
    return null;
  }

  // Check/request permissions
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Push notification permission not granted");
    return null;
  }

  // Get the Expo push token
  const { data: token } = await Notifications.getExpoPushTokenAsync({
    projectId: "2f4f7f3c-5d53-4cad-ba52-07cf94dbeac4",
  });

  // Register token with our server
  const platform = Platform.OS as "ios" | "android";
  try {
    await apiFetchWithAuthRetry("/api/push-tokens", {
      method: "POST",
      body: { token, platform },
    });
  } catch (err) {
    console.warn("Failed to register push token with server:", err);
  }

  currentPushToken = token;

  // Android notification channel
  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  return token;
}

/**
 * Unregister push token from the server (e.g. on logout).
 */
export async function unregisterPushToken(token: string) {
  try {
    await apiFetchWithAuthRetry("/api/push-tokens", {
      method: "DELETE",
      body: { token },
    });
  } catch (err) {
    console.warn("Failed to unregister push token:", err);
  }
}

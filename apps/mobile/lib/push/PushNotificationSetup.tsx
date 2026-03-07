import { usePushNotifications } from "./usePushNotifications";

/**
 * Invisible component that sets up push notification registration and handlers.
 * Must be placed inside AuthProvider + NavigationContainer.
 */
export function PushNotificationSetup() {
  usePushNotifications();
  return null;
}

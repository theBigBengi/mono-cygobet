import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { registerForPushNotifications } from "./pushNotifications";

/**
 * Hook to register for push notifications and handle notification taps.
 * Must be rendered inside AuthProvider and NavigationContainer.
 */
export function usePushNotifications() {
  const router = useRouter();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // Register for push notifications
    registerForPushNotifications();

    // Handle notification tap (when user taps a notification)
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;

        if (data?.type === "chat" && data?.groupId) {
          router.push(`/groups/${data.groupId}/chat`);
        } else if (data?.type === "invite") {
          router.push("/invites");
        }
      });

    return () => {
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(
          responseListener.current
        );
      }
    };
  }, [router]);
}

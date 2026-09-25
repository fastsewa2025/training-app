import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { apiClient } from "@/lib/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string>("");
  const notifListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        setExpoPushToken(token);
        // Persist token to backend so admin can send broadcasts
        apiClient
          .patch("/api/v1/auth/me", { expoPushToken: token })
          .catch(() => {}); // non-critical
      }
    });

    // Fired when notification arrives while app is foregrounded
    notifListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("[Push] Received:", notification);
      }
    );

    // Fired when user taps a notification
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        console.log("[Push] Tapped, data:", data);
        // Deep-link navigation can be added here
      });

    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return { expoPushToken };
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn("[Push] Must use physical device for push notifications");
    return null;
  }

  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("[Push] Permission not granted");
    return null;
  }

  // Get token (requires a valid EAS project ID — set expo.extra.eas.projectId
  // in app.json; `eas init` fills this in once you have an Expo account).
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId || projectId === "YOUR_EAS_PROJECT_ID") {
    console.warn(
      "[Push] No EAS project ID configured (expo.extra.eas.projectId in app.json) — push disabled"
    );
    return null;
  }
  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });

  // Android requires a notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("training-reminders", {
      name: "Training Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF6B2C",
    });
  }

  return tokenData.data;
}

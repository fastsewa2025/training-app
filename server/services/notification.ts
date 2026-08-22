/**
 * Push Notification Service
 * Uses Expo Push Notifications (works for both iOS & Android via Expo)
 * Swap with FCM directly if going bare React Native
 */

interface PushTicket {
  id: string;
  status: "ok" | "error";
  message?: string;
}

export async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<PushTicket | null> {
  if (!expoPushToken.startsWith("ExponentPushToken")) {
    console.warn("[Push] Invalid token format:", expoPushToken);
    return null;
  }

  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: expoPushToken,
        sound: "default",
        title,
        body,
        data: data || {},
        priority: "high",
        channelId: "training-reminders",
      }),
    });

    const result = await res.json();
    return result.data as PushTicket;
  } catch (err) {
    console.error("[Push] Failed to send notification:", err);
    return null;
  }
}

export async function sendBulkPushNotifications(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  // Expo accepts up to 100 messages per request
  const chunks: string[][] = [];
  for (let i = 0; i < tokens.length; i += 100) {
    chunks.push(tokens.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    const messages = chunk.map((token) => ({
      to: token,
      sound: "default",
      title,
      body,
      data: data || {},
      priority: "high",
      channelId: "training-reminders",
    }));

    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messages),
      });
    } catch (err) {
      console.error("[Push] Bulk send failed:", err);
    }
  }
}

// Pre-built notification templates
export const NotificationTemplates = {
  newCourseAvailable: (courseTitle: string) => ({
    title: "📚 New Course Available!",
    body: `"${courseTitle}" has just been published. Start learning now!`,
  }),
  quizReminder: (moduleName: string) => ({
    title: "🎯 Don't forget your quiz!",
    body: `Complete the quiz for "${moduleName}" to earn your certificate.`,
  }),
  courseCompleted: (courseTitle: string) => ({
    title: "🏆 Congratulations!",
    body: `You completed "${courseTitle}". Download your certificate now!`,
  }),
  dailyReminder: () => ({
    title: "⏰ Time to learn!",
    body: "Your daily training reminder. Keep up the good work!",
  }),
};

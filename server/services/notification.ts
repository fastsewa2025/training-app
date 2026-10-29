/**
 * Push notifications through Expo's push service (iOS and Android).
 *
 *  - Devices live in `push_devices` (several per user, one row per token).
 *    The old single `users.expo_push_token` column meant a user with a phone
 *    and a tablet only ever reached one of them, and dead tokens stayed
 *    forever.
 *  - Expo answers every message with a ticket; tokens reported as
 *    DeviceNotRegistered are disabled so they are never tried again.
 *  - Broadcasts only target active worker accounts (the old query also
 *    notified deactivated workers).
 */
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { pushDevices, users } from "@shared/schema";
import { config } from "../config";
import { db } from "../db";
import { err } from "../errors";
import { logger } from "../logger";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const CHUNK = 100;

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface SendStats {
  devices: number;
  sent: number;
  failed: number;
  disabled: number;
}

interface Ticket {
  status: "ok" | "error";
  message?: string;
  details?: { error?: string };
}

async function postChunk(messages: object[]): Promise<Ticket[]> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (config.push.expoAccessToken) headers.Authorization = `Bearer ${config.push.expoAccessToken}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(messages),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Expo push service answered ${res.status}`);
    const json = (await res.json()) as { data?: Ticket[] };
    return json.data ?? [];
  } finally {
    clearTimeout(timer);
  }
}

export async function sendToTokens(tokens: string[], message: PushMessage): Promise<SendStats> {
  const stats: SendStats = { devices: tokens.length, sent: 0, failed: 0, disabled: 0 };
  const dead: string[] = [];

  for (let i = 0; i < tokens.length; i += CHUNK) {
    const chunk = tokens.slice(i, i + CHUNK);
    const messages = chunk.map((to) => ({
      to,
      sound: "default",
      title: message.title,
      body: message.body,
      data: message.data ?? {},
      priority: "high",
      channelId: "training-reminders",
    }));
    try {
      const tickets = await postChunk(messages);
      tickets.forEach((ticket, idx) => {
        if (ticket.status === "ok") stats.sent++;
        else {
          stats.failed++;
          if (ticket.details?.error === "DeviceNotRegistered") dead.push(chunk[idx]);
        }
      });
    } catch (error) {
      stats.failed += chunk.length;
      logger.warn({ err: error }, "push batch failed");
    }
  }

  if (dead.length > 0) {
    await db.update(pushDevices).set({ disabledAt: new Date() }).where(inArray(pushDevices.token, dead));
    stats.disabled = dead.length;
  }
  return stats;
}

export async function sendToUser(userId: string, message: PushMessage): Promise<SendStats> {
  const rows = await db
    .select({ token: pushDevices.token })
    .from(pushDevices)
    .where(and(eq(pushDevices.userId, userId), isNull(pushDevices.disabledAt)));
  return sendToTokens(
    rows.map((r) => r.token),
    message
  );
}

async function workerTokens(): Promise<string[]> {
  const rows = await db
    .select({ token: pushDevices.token })
    .from(pushDevices)
    .innerJoin(users, eq(users.id, pushDevices.userId))
    .where(and(eq(users.role, "worker"), eq(users.isActive, true), isNull(users.deletedAt), isNull(pushDevices.disabledAt)));
  return rows.map((r) => r.token);
}

export async function broadcastToWorkers(message: PushMessage): Promise<SendStats> {
  return sendToTokens(await workerTokens(), message);
}

export interface BroadcastJob {
  /** How many phones it is going to. */
  devices: number;
  /** Settles when Expo has answered for every batch (never rejects: failures are counted in the stats). */
  done: Promise<SendStats>;
}

let running: Promise<SendStats> | null = null;

/**
 * Starts a broadcast and returns at once. Expo takes about 100 messages per call, so tens of thousands
 * of phones take minutes; waiting for that inside the admin's request ran into the proxy's 60-second
 * limit, the console reported a failure while the messages kept going out, and a second click sent
 * everything twice. Only one broadcast runs at a time in this process.
 */
export async function startBroadcast(message: PushMessage): Promise<BroadcastJob> {
  if (running) throw err("CONFLICT", { message: "A broadcast is still being sent. Wait until it has finished." });
  const tokens = await workerTokens();
  const done = sendToTokens(tokens, message).catch((error: unknown): SendStats => {
    logger.error({ err: error }, "broadcast failed");
    return { devices: tokens.length, sent: 0, failed: tokens.length, disabled: 0 };
  });
  running = done;
  void done.finally(() => {
    running = null;
  });
  return { devices: tokens.length, done };
}

export async function registerPushToken(userId: string, token: string, platform?: string): Promise<void> {
  // A token identifies a physical device install; if it was last used by another account (shared phone), it moves.
  await db
    .insert(pushDevices)
    .values({ userId, token, platform: platform ?? null })
    .onConflictDoUpdate({
      target: pushDevices.token,
      set: { userId, platform: platform ?? null, lastSeenAt: sql`now()`, disabledAt: null },
    });
}

export async function unregisterPushToken(userId: string, token: string): Promise<void> {
  await db.delete(pushDevices).where(and(eq(pushDevices.userId, userId), eq(pushDevices.token, token)));
}

export const NotificationTemplates = {
  courseCompleted: (courseTitle: string) => ({
    title: "🏆 Congratulations! / बधाई हो!",
    body: `You completed "${courseTitle}". Your certificate is ready. / आपने "${courseTitle}" पूरा किया — प्रमाणपत्र तैयार है।`,
  }),
  newCourseAvailable: (courseTitle: string) => ({
    title: "📚 New course / नया कोर्स",
    body: `"${courseTitle}" is now available. / "${courseTitle}" अब उपलब्ध है।`,
  }),
};

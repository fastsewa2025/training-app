import { Express, Request, Response, NextFunction, RequestHandler } from "express";
import { createServer, Server } from "node:http";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import Redis from "ioredis";
import { RedisStore } from "rate-limit-redis";

import { authRouter } from "./routes/auth";
import { coursesRouter } from "./routes/courses";
import { progressRouter } from "./routes/progress";
import { quizRouter } from "./routes/quiz";
import { certificatesRouter } from "./routes/certificates";
import { adminRouter } from "./routes/admin";
import { uploadRouter } from "./routes/upload";

// Rate limiting is an enhancement, never a dependency: if Redis is
// configured but unreachable (down, still starting, mid-restart), that
// must never be able to take the whole API down. This dynamically picks
// between a Redis-backed limiter (shared across instances, what
// docker-compose provisions Redis for) and a plain in-memory one based on
// the live connection state, and fails the whole check open — allowing
// the request through — if anything about rate limiting itself errors.
function buildLimiter(
  prefix: string,
  opts: { windowMs: number; max: number; message: unknown }
): RequestHandler {
  const shared = { ...opts, standardHeaders: true, legacyHeaders: false };
  const memoryLimiter = rateLimit(shared);

  const url = process.env.REDIS_URL;
  if (!url) return memoryLimiter;

  const client = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false, // fail fast instead of queuing into a crash
    retryStrategy: (times) => Math.min(times * 500, 5000),
  });
  client.on("error", (err) => {
    console.error(`[RateLimit:${prefix}] Redis error:`, err.message);
  });
  client.connect().catch((err) => {
    console.error(`[RateLimit:${prefix}] Redis connection failed, using in-memory limiter until it recovers:`, err.message);
  });

  const redisLimiter = rateLimit({
    ...shared,
    store: new RedisStore({
      prefix: `rl:${prefix}:`,
      sendCommand: (...args: string[]) =>
        client.call(args[0], ...args.slice(1)) as ReturnType<RedisStore["sendCommand"]>,
    }),
  });

  return (req: Request, res: Response, next: NextFunction) => {
    // Only ever route to the Redis-backed limiter once the connection is
    // confirmed live — never while it's still connecting/reconnecting/down.
    const active = client.status === "ready" ? redisLimiter : memoryLimiter;
    try {
      active(req, res, (err?: unknown) => {
        if (err) {
          console.error(`[RateLimit:${prefix}] middleware error, allowing request through:`, err);
          return next();
        }
        next();
      });
    } catch (err) {
      console.error(`[RateLimit:${prefix}] middleware threw, allowing request through:`, err);
      next();
    }
  };
}

const apiLimiter = buildLimiter("api", {
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: "Too many requests, please try again later" },
});

const authLimiter = buildLimiter("auth", {
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: "Too many authentication attempts" },
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use("/api/", apiLimiter);
  app.use("/api/v1/auth/login", authLimiter);
  app.use("/api/v1/auth/register", authLimiter);
  app.use("/api/v1/auth/forgot-password", authLimiter);
  app.use("/api/v1/auth/reset-password", authLimiter);
  app.use("/api/v1/auth/change-password", authLimiter);

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/courses", coursesRouter);
  app.use("/api/v1/progress", progressRouter);
  app.use("/api/v1/quiz", quizRouter);
  app.use("/api/v1/certificates", certificatesRouter);
  app.use("/api/v1/admin", adminRouter);
  app.use("/api/v1/upload", uploadRouter);

  // Serve local uploads in dev
  if (process.env.NODE_ENV !== "production") {
    const { join } = await import("path");
    const express = await import("express");
    app.use("/uploads", express.default.static(join(process.cwd(), "public", "uploads")));
  }

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString(), version: "2.0.0" });
  });

  return createServer(app);
}

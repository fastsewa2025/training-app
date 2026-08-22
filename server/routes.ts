import { Express } from "express";
import { createServer, Server } from "node:http";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

import { authRouter } from "./routes/auth";
import { coursesRouter } from "./routes/courses";
import { progressRouter } from "./routes/progress";
import { quizRouter } from "./routes/quiz";
import { certificatesRouter } from "./routes/certificates";
import { adminRouter } from "./routes/admin";
import { uploadRouter } from "./routes/upload";

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

const authLimiter = rateLimit({
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

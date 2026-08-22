import "dotenv/config";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false }));

// Strict CORS from env allowlist
app.use((req: Request, res: Response, next: NextFunction) => {
  const allowedOrigins = (
    process.env.ALLOWED_ORIGINS || "http://localhost:5000"
  )
    .split(",")
    .map((o) => o.trim());

  const origin = req.header("origin");
  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.header("Access-Control-Allow-Credentials", "true");
  }
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// Structured JSON logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    if (!req.path.startsWith("/api")) return;
    const ms = Date.now() - start;
    const level =
      res.statusCode >= 500 ? "ERROR" : res.statusCode >= 400 ? "WARN" : "INFO";
    console.log(
      JSON.stringify({
        level,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ms,
        ts: new Date().toISOString(),
      })
    );
  });
  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Global error handler
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const e = err as { status?: number; statusCode?: number; message?: string };
    const status = e.status || e.statusCode || 500;
    const message = status === 500 ? "Internal Server Error" : e.message;
    if (status === 500) console.error("[ERROR]", err);
    if (!res.headersSent) res.status(status).json({ error: message });
  });

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({ port, host: "0.0.0.0" }, () => {
    console.log(
      JSON.stringify({
        level: "INFO",
        message: `FastSewa API on port ${port}`,
        env: process.env.NODE_ENV,
        ts: new Date().toISOString(),
      })
    );
  });
})();

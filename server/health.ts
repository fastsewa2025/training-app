import { Router } from "express";
import { checkDatabase, poolStats } from "./db";
import { redisStatus } from "./redis";

/**
 * The version this code is: written into the bundle from package.json by scripts/build-server.mjs, so
 * an image built from a tagged checkout reports that tag's version without anyone passing a build
 * argument (the compose file used to hard-code "3.0.0", so every later release said it was 3.0.0).
 * APP_VERSION still wins when a release pipeline sets it.
 */
declare const __APP_VERSION__: string | undefined;
const BUNDLED_VERSION = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : undefined;
export const APP_VERSION = process.env.APP_VERSION || BUNDLED_VERSION || process.env.npm_package_version || "dev";
const STARTED_AT = Date.now();

let draining = false;
/** Called when a shutdown signal arrives: readiness starts failing so the load balancer stops sending traffic. */
export const setDraining = (): void => {
  draining = true;
};
export const isDraining = (): boolean => draining;

/**
 * GET /api/health        liveness  — the process answers. Never touches the database, so a database
 *                                    outage cannot make an orchestrator restart healthy API containers.
 * GET /api/health/ready  readiness — the database answers and we are not shutting down. Redis being
 *                                    down does not fail readiness (rate limiting degrades to memory).
 */
export function healthRoutes(): Router {
  const r = Router();

  r.get("/", (_req, res) => {
    res.json({
      status: "ok",
      version: APP_VERSION,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round((Date.now() - STARTED_AT) / 1000),
    });
  });

  r.get("/ready", async (_req, res) => {
    if (draining) {
      res.status(503).json({ status: "draining", version: APP_VERSION });
      return;
    }
    const database = await checkDatabase(2000);
    res.status(database.ok ? 200 : 503).json({
      status: database.ok ? "ready" : "unavailable",
      version: APP_VERSION,
      database: { ok: database.ok, latencyMs: database.latencyMs }, // the error text stays in the logs, not on a public URL
      redis: redisStatus(),
      pool: poolStats(),
    });
  });

  return r;
}

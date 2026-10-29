import { randomUUID } from "node:crypto";
import type { Request, RequestHandler } from "express";
import { logger } from "../logger";

const ID_RE = /^[A-Za-z0-9._-]{8,64}$/;

/**
 * Remembers the route pattern Express matched, with the path its router is mounted under, at the
 * moment it matches. Express puts `req.baseUrl` back while an error travels out of the routers, so
 * reading it when the response finishes turned a failed `POST /api/v1/auth/login` into `/login`
 * (successful requests were right). Failures are the lines an alert on password guessing needs.
 */
function trackRoute(req: Request): () => string {
  let baseUrl: string = req.baseUrl ?? "";
  let entered = "";
  let route: unknown = req.route;
  let pattern: string | undefined;
  Object.defineProperty(req, "baseUrl", {
    configurable: true,
    enumerable: true,
    get: () => baseUrl,
    set: (value: string) => {
      if (value.length > baseUrl.length) entered = value; // entering a router; leaving one only shortens it
      baseUrl = value;
    },
  });
  Object.defineProperty(req, "route", {
    configurable: true,
    enumerable: true,
    get: () => route,
    set: (value: unknown) => {
      route = value;
      const path = (value as { path?: unknown } | undefined)?.path;
      if (typeof path === "string") pattern = `${baseUrl}${path}`;
    },
  });
  // Nothing matched (the sign-in check refused the request first, or no such route): name the deepest
  // router reached, never the raw path, which can hold ids and certificate numbers.
  return () => pattern ?? (entered ? `${entered} (unmatched)` : "(unmatched)");
}

/**
 * Gives every request a correlation id (honouring a sane incoming
 * X-Request-Id, e.g. from the load balancer) and writes one structured access
 * log line when it finishes. Query strings are never logged (they can carry
 * signed-link signatures), and routes are logged as patterns, not raw paths.
 */
export const requestContext: RequestHandler = (req, res, next) => {
  const incoming = req.header("x-request-id");
  req.id = incoming && ID_RE.test(incoming) ? incoming : randomUUID();
  res.setHeader("X-Request-Id", req.id);
  req.log = logger.child({ reqId: req.id });
  const matchedRoute = trackRoute(req);

  const started = process.hrtime.bigint();
  res.on("finish", () => {
    const status = res.statusCode;
    const url = req.originalUrl;
    const isHealth = url.startsWith("/api/health");
    const isApi = url.startsWith("/api") || url.startsWith("/verify");
    if ((isHealth && status < 400) || (!isApi && status < 400)) return;

    const entry = {
      method: req.method,
      route: matchedRoute(),
      status,
      ms: Math.round(Number(process.hrtime.bigint() - started) / 1e6),
      ip: req.ip,
      userId: req.user?.id,
      bytes: Number(res.getHeader("content-length")) || undefined,
    };
    if (status >= 500) req.log.error(entry, "request");
    else if (status >= 400) req.log.warn(entry, "request");
    else req.log.info(entry, "request");
  });
  next();
};

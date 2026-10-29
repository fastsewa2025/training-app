import type { Request, RequestHandler } from "express";
import type { Role } from "@shared/schema";
import { consentOutdated } from "../auth/consent";
import { verifyAccessToken } from "../auth/tokens";
import { loadAuthUser } from "../auth/userCache";
import { err } from "../errors";

/**
 * While `must_change_password` is set (after an admin-issued temporary
 * password, or when a login revealed a password that no longer meets the
 * rules) the account may only do what is needed to choose a new password.
 */
const ALLOWED_WHILE_MUST_CHANGE = new Set([
  "GET /api/v1/auth/me",
  "POST /api/v1/auth/change-password",
  "POST /api/v1/auth/logout",
  "DELETE /api/v1/auth/push-token", // signing out removes this phone's push address first
  "GET /api/v1/config",
]);

/**
 * A learner who has not accepted the current privacy notice (CONSENT_VERSION) may read their own
 * account, accept, leave, or use their rights over their data (export, erase) — nothing else.
 */
const ALLOWED_WHILE_CONSENT_PENDING = new Set([
  "GET /api/v1/auth/me",
  "POST /api/v1/auth/consent",
  "POST /api/v1/auth/change-password",
  "POST /api/v1/auth/logout",
  "POST /api/v1/auth/logout-all",
  "DELETE /api/v1/auth/push-token",
  "GET /api/v1/auth/me/export",
  "DELETE /api/v1/auth/me",
  "GET /api/v1/config",
]);

/**
 * Verifies the bearer token and loads the current account into `req.user`.
 * Exposed separately so a route can accept either a bearer token or a signed
 * link (certificate downloads) without duplicating these checks.
 */
export async function authenticate(req: Request): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !/^Bearer\s+\S+$/i.test(header)) throw err("UNAUTHORIZED");

  const claims = verifyAccessToken(header.replace(/^Bearer\s+/i, ""));
  const user = await loadAuthUser(claims.userId);
  // token_version mismatch = the user changed password / was deactivated / re-roled since this token was issued.
  if (!user || !user.isActive || user.tokenVersion !== claims.tokenVersion) throw err("UNAUTHORIZED");

  req.user = { id: user.id, username: user.username, displayName: user.displayName, role: user.role };

  const route = `${req.method} ${req.originalUrl.split("?")[0]}`;
  if (user.mustChangePassword) {
    if (!ALLOWED_WHILE_MUST_CHANGE.has(route)) throw err("PASSWORD_CHANGE_REQUIRED");
  } else if (consentOutdated(user) && !ALLOWED_WHILE_CONSENT_PENDING.has(route)) {
    throw err("CONSENT_UPDATE_REQUIRED");
  }
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  await authenticate(req);
  next();
};

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) throw err("FORBIDDEN");
    next();
  };
}

export const isStaff = (role: Role) => role === "admin" || role === "trainer";

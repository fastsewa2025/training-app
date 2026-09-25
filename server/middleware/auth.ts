import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: "admin" | "trainer" | "worker";
  };
}

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

export function generateTokens(userId: string, role: string) {
  const accessToken = jwt.sign({ sub: userId, role }, JWT_SECRET, {
    expiresIn: "15m",
  });
  const refreshToken = jwt.sign(
    { sub: userId, type: "refresh" },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
  return { accessToken, refreshToken };
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authorization header required" });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      sub: string;
      role: string;
    };

    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: "User not found or deactivated" });
    }

    req.user = { id: user.id, username: user.username, role: user.role };
    next();
  } catch {
    return res.status(401).json({ error: "Token expired or invalid" });
  }
}

export function requireRole(
  ...roles: ("admin" | "trainer" | "worker")[]
) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: "Insufficient permissions for this action" });
    }
    next();
  };
}

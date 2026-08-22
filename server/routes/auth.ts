import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import { db } from "../db";
import {
  users,
  refreshTokens,
  registerSchema,
  loginSchema,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import {
  generateTokens,
  requireAuth,
  AuthRequest,
} from "../middleware/auth";
import jwt from "jsonwebtoken";

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

// POST /api/v1/auth/register
authRouter.post("/register", async (req: Request, res: Response) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }

  const { username, password, displayName, phoneNumber, preferredLang } =
    result.data;

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (existing.length > 0) {
    return res.status(409).json({ error: "Username already taken" });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [user] = await db
    .insert(users)
    .values({
      username,
      passwordHash,
      displayName,
      phoneNumber,
      preferredLang: preferredLang || "en",
      role: "worker",
    })
    .returning({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      preferredLang: users.preferredLang,
    });

  const { accessToken, refreshToken } = generateTokens(user.id, user.role);

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  res.status(201).json({ user, accessToken, refreshToken });
});

// POST /api/v1/auth/login
authRouter.post("/login", async (req: Request, res: Response) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: "Invalid request format" });
  }

  const { username, password } = result.data;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  // Timing-safe: always run bcrypt even if user not found (prevents enumeration)
  const hashToCheck =
    user?.passwordHash || "$2b$12$invalidhashfortimingsafetyXXXXXXXXXXXXXX";
  const valid = await bcrypt.compare(password, hashToCheck);

  if (!user || !valid || !user.isActive) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  const { accessToken, refreshToken } = generateTokens(user.id, user.role);

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  res.json({
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      preferredLang: user.preferredLang,
      avatarUrl: user.avatarUrl,
    },
    accessToken,
    refreshToken,
  });
});

// POST /api/v1/auth/refresh
authRouter.post("/refresh", async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token required" });
  }

  try {
    const payload = jwt.verify(refreshToken, JWT_SECRET) as {
      sub: string;
      type: string;
    };

    if (payload.type !== "refresh") {
      return res.status(401).json({ error: "Invalid token type" });
    }

    const [stored] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, hashToken(refreshToken)))
      .limit(1);

    if (!stored || stored.expiresAt < new Date()) {
      return res.status(401).json({ error: "Refresh token expired or invalid" });
    }

    const [user] = await db
      .select({ id: users.id, role: users.role, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: "User not found" });
    }

    // Rotate: delete old, issue new
    await db
      .delete(refreshTokens)
      .where(eq(refreshTokens.id, stored.id));

    const tokens = generateTokens(user.id, user.role);

    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: hashToken(tokens.refreshToken),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    res.json(tokens);
  } catch {
    res.status(401).json({ error: "Invalid refresh token" });
  }
});

// POST /api/v1/auth/logout
authRouter.post("/logout", requireAuth, async (req: AuthRequest, res: Response) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await db
      .delete(refreshTokens)
      .where(eq(refreshTokens.tokenHash, hashToken(refreshToken)));
  }
  res.json({ message: "Logged out successfully" });
});

// GET /api/v1/auth/me
authRouter.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      preferredLang: users.preferredLang,
      avatarUrl: users.avatarUrl,
      phoneNumber: users.phoneNumber,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, req.user!.id))
    .limit(1);

  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

// PATCH /api/v1/auth/me - update profile
authRouter.patch("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  const { displayName, preferredLang, phoneNumber, expoPushToken } = req.body;

  const updates: Partial<typeof users.$inferInsert> = {};
  if (displayName) updates.displayName = String(displayName).slice(0, 60);
  if (preferredLang && ["en", "hi"].includes(preferredLang))
    updates.preferredLang = preferredLang;
  if (phoneNumber) updates.phoneNumber = String(phoneNumber);
  if (expoPushToken) updates.expoPushToken = String(expoPushToken);
  updates.updatedAt = new Date();

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, req.user!.id))
    .returning({
      id: users.id,
      displayName: users.displayName,
      preferredLang: users.preferredLang,
      phoneNumber: users.phoneNumber,
    });

  res.json(updated);
});

import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { createHash, randomInt } from "crypto";
import { db } from "../db";
import {
  users,
  refreshTokens,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import {
  generateTokens,
  requireAuth,
  AuthRequest,
} from "../middleware/auth";
import jwt from "jsonwebtoken";
import { sendPasswordResetEmail } from "../services/email";

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

// Unambiguous charset — no 0/O, 1/I/L — so a code is easy to read back off
// an email and type correctly.
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function generateResetCode(length = 8): string {
  let code = "";
  for (let i = 0; i < length; i++) code += CODE_CHARS[randomInt(CODE_CHARS.length)];
  return code;
}

// POST /api/v1/auth/register
authRouter.post("/register", async (req: Request, res: Response) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }

  const { username, password, displayName, email, phoneNumber, preferredLang } =
    result.data;

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (existing.length > 0) {
    return res.status(409).json({ error: "Username already taken" });
  }

  if (email) {
    const existingEmail = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existingEmail.length > 0) {
      return res.status(409).json({ error: "Email already in use" });
    }
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [user] = await db
    .insert(users)
    .values({
      username,
      passwordHash,
      displayName,
      email,
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
      email: users.email,
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
      email: users.email,
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
  const { displayName, preferredLang, phoneNumber, email, expoPushToken } = req.body;

  const updates: Partial<typeof users.$inferInsert> = {};
  if (displayName) updates.displayName = String(displayName).slice(0, 60);
  if (preferredLang && ["en", "hi"].includes(preferredLang))
    updates.preferredLang = preferredLang;
  if (phoneNumber) updates.phoneNumber = String(phoneNumber);
  if (expoPushToken) updates.expoPushToken = String(expoPushToken);
  if (email) {
    const emailStr = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
      return res.status(400).json({ error: "Invalid email address" });
    }
    const existingEmail = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, emailStr))
      .limit(1);
    if (existingEmail.length > 0 && existingEmail[0].id !== req.user!.id) {
      return res.status(409).json({ error: "Email already in use" });
    }
    updates.email = emailStr;
  }
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
      email: users.email,
    });

  res.json(updated);
});

// POST /api/v1/auth/forgot-password
authRouter.post("/forgot-password", async (req: Request, res: Response) => {
  const result = forgotPasswordSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }
  const { email } = result.data;

  const [user] = await db
    .select({ id: users.id, displayName: users.displayName })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // Same response whether or not the email is on file, so this endpoint
  // can't be used to enumerate registered accounts.
  if (user) {
    const code = generateResetCode();
    await db
      .update(users)
      .set({
        passwordResetTokenHash: hashToken(code),
        passwordResetExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
      })
      .where(eq(users.id, user.id));

    try {
      await sendPasswordResetEmail(email, code, user.displayName);
    } catch (err) {
      console.error("[Email] Failed to send reset email:", err);
    }
  }

  res.json({ message: "If that email is registered, a reset code has been sent." });
});

// POST /api/v1/auth/reset-password
authRouter.post("/reset-password", async (req: Request, res: Response) => {
  const result = resetPasswordSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }
  const { email, code, newPassword } = result.data;

  const [user] = await db
    .select({
      id: users.id,
      passwordResetTokenHash: users.passwordResetTokenHash,
      passwordResetExpiresAt: users.passwordResetExpiresAt,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const isValid =
    !!user &&
    !!user.passwordResetTokenHash &&
    user.passwordResetTokenHash === hashToken(code) &&
    !!user.passwordResetExpiresAt &&
    user.passwordResetExpiresAt > new Date();

  if (!isValid) {
    return res.status(400).json({ error: "Invalid or expired reset code" });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db
    .update(users)
    .set({
      passwordHash,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user!.id));

  // Reset = "I might not trust my old sessions" -> sign out everywhere.
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, user!.id));

  res.json({ message: "Password reset successful. Please log in again." });
});

// POST /api/v1/auth/change-password — for a logged-in user who knows their
// current password (distinct from forgot/reset-password, which is for when
// they don't).
authRouter.post(
  "/change-password",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const result = changePasswordSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.flatten() });
    }
    const { currentPassword, newPassword } = result.data;

    const [user] = await db
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, req.user!.id))
      .limit(1);

    if (!user) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    // Same policy as reset-password: sign out everywhere, current session
    // included, so there's one consistent "you changed your password" story
    // rather than a quietly-still-valid access token elsewhere.
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, user.id));

    res.json({ message: "Password changed. Please log in again." });
  }
);

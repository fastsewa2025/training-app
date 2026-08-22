import { Router, Response } from "express";
import { db } from "../db";
import {
  users,
  courses,
  modules,
  lessons,
  courseEnrollments,
  moduleProgress,
  certificates,
  createCourseSchema,
  createModuleSchema,
  createLessonSchema,
} from "@shared/schema";
import { eq, desc, count, sql, and } from "drizzle-orm";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";
import { z } from "zod";

export const adminRouter = Router();
// All admin routes require auth + admin/trainer role
adminRouter.use(requireAuth, requireRole("admin", "trainer"));

// ─── Dashboard ────────────────────────────────────────────────────────────────
adminRouter.get("/dashboard", async (_req: AuthRequest, res: Response) => {
  const [[totalWorkers], [totalCourses], [totalEnrollments], [completions]] =
    await Promise.all([
      db.select({ count: count() }).from(users).where(eq(users.role, "worker")),
      db.select({ count: count() }).from(courses).where(eq(courses.isPublished, true)),
      db.select({ count: count() }).from(courseEnrollments),
      db
        .select({ count: count() })
        .from(courseEnrollments)
        .where(sql`completed_at IS NOT NULL`),
    ]);

  const completionRate =
    totalEnrollments.count > 0
      ? Math.round((completions.count / totalEnrollments.count) * 100)
      : 0;

  res.json({
    totalWorkers: totalWorkers.count,
    totalCourses: totalCourses.count,
    totalEnrollments: totalEnrollments.count,
    completionRate,
  });
});

// ─── Workers ──────────────────────────────────────────────────────────────────
adminRouter.get("/workers", async (_req: AuthRequest, res: Response) => {
  const workers = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      phoneNumber: users.phoneNumber,
      preferredLang: users.preferredLang,
      isActive: users.isActive,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .where(eq(users.role, "worker"))
    .orderBy(desc(users.createdAt));

  res.json(workers);
});

adminRouter.get("/workers/:userId/progress", async (req: AuthRequest, res: Response) => {
  const progress = await db
    .select({
      moduleId: moduleProgress.moduleId,
      startedAt: moduleProgress.startedAt,
      completedAt: moduleProgress.completedAt,
      quizScore: moduleProgress.quizScore,
      quizPassed: moduleProgress.quizPassed,
    })
    .from(moduleProgress)
    .where(eq(moduleProgress.userId, req.params.userId))
    .orderBy(desc(moduleProgress.startedAt));

  const certs = await db
    .select({
      id: certificates.id,
      certificateNumber: certificates.certificateNumber,
      earnedAt: certificates.earnedAt,
      courseId: certificates.courseId,
    })
    .from(certificates)
    .where(eq(certificates.userId, req.params.userId));

  res.json({ moduleProgress: progress, certificates: certs });
});

// PATCH /api/v1/admin/workers/:id/deactivate
adminRouter.patch(
  "/workers/:id/deactivate",
  requireRole("admin"),
  async (req: AuthRequest, res: Response) => {
    await db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(users.id, req.params.id), eq(users.role, "worker")));
    res.json({ message: "Worker deactivated" });
  }
);

// ─── Courses CRUD ─────────────────────────────────────────────────────────────
adminRouter.get("/courses", async (_req: AuthRequest, res: Response) => {
  const all = await db
    .select()
    .from(courses)
    .orderBy(desc(courses.createdAt));
  res.json(all);
});

adminRouter.post(
  "/courses",
  requireRole("admin"),
  async (req: AuthRequest, res: Response) => {
    const result = createCourseSchema.safeParse(req.body);
    if (!result.success)
      return res.status(400).json({ error: result.error.flatten() });

    const [course] = await db
      .insert(courses)
      .values({ ...result.data, createdBy: req.user!.id })
      .returning();
    res.status(201).json(course);
  }
);

adminRouter.put(
  "/courses/:id",
  requireRole("admin"),
  async (req: AuthRequest, res: Response) => {
    const result = createCourseSchema.partial().safeParse(req.body);
    if (!result.success)
      return res.status(400).json({ error: result.error.flatten() });

    const [updated] = await db
      .update(courses)
      .set({ ...result.data, updatedAt: new Date() })
      .where(eq(courses.id, req.params.id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Course not found" });
    res.json(updated);
  }
);

adminRouter.patch(
  "/courses/:id/publish",
  requireRole("admin"),
  async (req: AuthRequest, res: Response) => {
    const { published } = req.body;
    const [course] = await db
      .update(courses)
      .set({ isPublished: Boolean(published), updatedAt: new Date() })
      .where(eq(courses.id, req.params.id))
      .returning();
    res.json(course);
  }
);

adminRouter.delete(
  "/courses/:id",
  requireRole("admin"),
  async (req: AuthRequest, res: Response) => {
    await db.delete(courses).where(eq(courses.id, req.params.id));
    res.json({ message: "Course deleted" });
  }
);

// ─── Modules CRUD ─────────────────────────────────────────────────────────────
adminRouter.post(
  "/courses/:courseId/modules",
  requireRole("admin"),
  async (req: AuthRequest, res: Response) => {
    const result = createModuleSchema.safeParse(req.body);
    if (!result.success)
      return res.status(400).json({ error: result.error.flatten() });

    const [mod] = await db
      .insert(modules)
      .values({ ...result.data, courseId: req.params.courseId })
      .returning();
    res.status(201).json(mod);
  }
);

adminRouter.put(
  "/modules/:id",
  requireRole("admin"),
  async (req: AuthRequest, res: Response) => {
    const result = createModuleSchema.partial().safeParse(req.body);
    if (!result.success)
      return res.status(400).json({ error: result.error.flatten() });

    const [updated] = await db
      .update(modules)
      .set(result.data)
      .where(eq(modules.id, req.params.id))
      .returning();
    res.json(updated);
  }
);

adminRouter.delete(
  "/modules/:id",
  requireRole("admin"),
  async (req: AuthRequest, res: Response) => {
    await db.delete(modules).where(eq(modules.id, req.params.id));
    res.json({ message: "Module deleted" });
  }
);

// ─── Lessons CRUD ─────────────────────────────────────────────────────────────
adminRouter.post(
  "/modules/:moduleId/lessons",
  requireRole("admin"),
  async (req: AuthRequest, res: Response) => {
    const result = createLessonSchema.safeParse(req.body);
    if (!result.success)
      return res.status(400).json({ error: result.error.flatten() });

    const [lesson] = await db
      .insert(lessons)
      .values({ ...result.data, moduleId: req.params.moduleId })
      .returning();
    res.status(201).json(lesson);
  }
);

adminRouter.put(
  "/lessons/:id",
  requireRole("admin"),
  async (req: AuthRequest, res: Response) => {
    const result = createLessonSchema.partial().safeParse(req.body);
    if (!result.success)
      return res.status(400).json({ error: result.error.flatten() });

    const [updated] = await db
      .update(lessons)
      .set(result.data)
      .where(eq(lessons.id, req.params.id))
      .returning();
    res.json(updated);
  }
);

adminRouter.delete(
  "/lessons/:id",
  requireRole("admin"),
  async (req: AuthRequest, res: Response) => {
    await db.delete(lessons).where(eq(lessons.id, req.params.id));
    res.json({ message: "Lesson deleted" });
  }
);

// ─── Push Notifications ───────────────────────────────────────────────────────
adminRouter.post("/notify/broadcast", requireRole("admin"), async (req: AuthRequest, res: Response) => {
  const { title, body } = req.body;
  if (!title || !body) return res.status(400).json({ error: "title and body required" });

  const workers = await db
    .select({ expoPushToken: users.expoPushToken })
    .from(users)
    .where(eq(users.role, "worker"));

  const tokens = workers
    .map((w) => w.expoPushToken)
    .filter((t): t is string => !!t && t.startsWith("ExponentPushToken"));

  if (tokens.length === 0) return res.json({ sent: 0, message: "No registered devices" });

  const { sendBulkPushNotifications } = await import("../services/notification");
  await sendBulkPushNotifications(tokens, title, body);

  res.json({ sent: tokens.length });
});
adminRouter.get("/analytics/courses", async (_req: AuthRequest, res: Response) => {
  const data = await db
    .select({
      courseId: courseEnrollments.courseId,
      courseTitle: courses.title,
      enrolled: count(courseEnrollments.id),
    })
    .from(courseEnrollments)
    .innerJoin(courses, eq(courses.id, courseEnrollments.courseId))
    .groupBy(courseEnrollments.courseId, courses.title)
    .orderBy(desc(count(courseEnrollments.id)));

  res.json(data);
});

import { Router, Response } from "express";
import { db } from "../db";
import {
  lessonProgress,
  moduleProgress,
  courseEnrollments,
  lessons,
  modules,
  courses,
  certificates,
} from "@shared/schema";
import { eq, and, count, sql, asc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { z } from "zod";
import { paramStr } from "../utils/params";
import { evaluateModuleCompletion } from "../services/progress";

export const progressRouter = Router();
progressRouter.use(requireAuth);

// POST /api/v1/progress/lesson — upsert lesson progress + video resume
progressRouter.post("/lesson", async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    lessonId: z.string().min(1),
    videoProgressSeconds: z.number().int().min(0).optional(),
    completed: z.boolean().optional(),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });

  const { lessonId, videoProgressSeconds, completed } = result.data;

  const [progress] = await db
    .insert(lessonProgress)
    .values({
      userId: req.user!.id,
      lessonId,
      videoProgressSeconds: videoProgressSeconds ?? 0,
      completed: completed ?? false,
      completedAt: completed ? new Date() : undefined,
    })
    .onConflictDoUpdate({
      target: [lessonProgress.userId, lessonProgress.lessonId],
      set: {
        videoProgressSeconds: sql`EXCLUDED.video_progress_seconds`,
        completed: sql`EXCLUDED.completed`,
        completedAt: sql`EXCLUDED.completed_at`,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (completed) {
    await checkAndUpdateModuleProgress(req.user!.id, lessonId);
  }

  res.json(progress);
});

// GET /api/v1/progress/lesson/:lessonId — get resume point
progressRouter.get("/lesson/:lessonId", async (req: AuthRequest, res: Response) => {
  const [progress] = await db
    .select()
    .from(lessonProgress)
    .where(
      and(
        eq(lessonProgress.userId, req.user!.id),
        eq(lessonProgress.lessonId, paramStr(req.params.lessonId))
      )
    )
    .limit(1);

  res.json(progress || { videoProgressSeconds: 0, completed: false });
});

// GET /api/v1/progress/all-lessons — all lesson progress for current user (used by TasksScreen)
progressRouter.get("/all-lessons", async (req: AuthRequest, res: Response) => {
  const progress = await db
    .select({
      lessonId: lessonProgress.lessonId,
      completed: lessonProgress.completed,
      videoProgressSeconds: lessonProgress.videoProgressSeconds,
      completedAt: lessonProgress.completedAt,
    })
    .from(lessonProgress)
    .where(eq(lessonProgress.userId, req.user!.id));

  res.json(progress);
});

// GET /api/v1/progress/course/:courseId
progressRouter.get("/course/:courseId", async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  const [enrollment] = await db
    .select()
    .from(courseEnrollments)
    .where(
      and(
        eq(courseEnrollments.userId, userId),
        eq(courseEnrollments.courseId, paramStr(req.params.courseId))
      )
    )
    .limit(1);

  if (!enrollment) return res.status(404).json({ error: "Not enrolled" });

  const modProgress = await db
    .select()
    .from(moduleProgress)
    .where(eq(moduleProgress.userId, userId));

  const lessonProg = await db
    .select()
    .from(lessonProgress)
    .where(eq(lessonProgress.userId, userId));

  res.json({ enrollment, moduleProgress: modProgress, lessonProgress: lessonProg });
});

// GET /api/v1/progress/enrolled-courses
// Returns all enrolled courses with their full module+lesson tree (for TasksScreen)
progressRouter.get("/enrolled-courses", async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  // Get enrolled course IDs
  const enrollments = await db
    .select({ courseId: courseEnrollments.courseId, completionPercent: courseEnrollments.completionPercent })
    .from(courseEnrollments)
    .where(eq(courseEnrollments.userId, userId));

  if (enrollments.length === 0) return res.json([]);

  const enrolledIds = enrollments.map((e) => e.courseId);
  const enrollMap = new Map(enrollments.map((e) => [e.courseId, e.completionPercent]));

  // Fetch each enrolled course with its modules and lessons
  const results = await Promise.all(
    enrolledIds.map(async (courseId) => {
      const [course] = await db
        .select({ id: courses.id, title: courses.title, titleHi: courses.titleHi, category: courses.category })
        .from(courses)
        .where(eq(courses.id, courseId))
        .limit(1);
      if (!course) return null;

      const courseModules = await db
        .select()
        .from(modules)
        .where(eq(modules.courseId, courseId))
        .orderBy(asc(modules.sortOrder));

      const modulesWithLessons = await Promise.all(
        courseModules.map(async (mod) => {
          const modLessons = await db
            .select({ id: lessons.id, title: lessons.title, titleHi: lessons.titleHi, contentType: lessons.contentType, sortOrder: lessons.sortOrder })
            .from(lessons)
            .where(eq(lessons.moduleId, mod.id))
            .orderBy(asc(lessons.sortOrder));
          return { ...mod, lessons: modLessons };
        })
      );

      return { ...course, completionPercent: enrollMap.get(courseId) ?? 0, modules: modulesWithLessons };
    })
  );

  res.json(results.filter(Boolean));
});

// GET /api/v1/progress/stats
progressRouter.get("/stats", async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  const [[completedMods], [completedLessons], [certs], [enrolledCourses]] =
    await Promise.all([
      db
        .select({ count: count() })
        .from(moduleProgress)
        .where(and(eq(moduleProgress.userId, userId), sql`completed_at IS NOT NULL`)),
      db
        .select({ count: count() })
        .from(lessonProgress)
        .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.completed, true))),
      db
        .select({ count: count() })
        .from(certificates)
        .where(eq(certificates.userId, userId)),
      db
        .select({ count: count() })
        .from(courseEnrollments)
        .where(eq(courseEnrollments.userId, userId)),
    ]);

  res.json({
    modulesCompleted: completedMods.count,
    lessonsCompleted: completedLessons.count,
    certificatesEarned: certs.count,
    coursesEnrolled: enrolledCourses.count,
  });
});

// ─── Internal helper ──────────────────────────────────────────────────────────
// Resolves lessonId -> moduleId, then defers to the shared evaluator in
// services/progress.ts, which is also called from quiz.ts on quiz submit.
// That's the single source of truth for module/course completion + cert
// issuance — don't reimplement the check here.
async function checkAndUpdateModuleProgress(userId: string, lessonId: string) {
  const [lesson] = await db
    .select({ moduleId: lessons.moduleId })
    .from(lessons)
    .where(eq(lessons.id, lessonId))
    .limit(1);
  if (!lesson) return;

  await evaluateModuleCompletion(userId, lesson.moduleId);
}

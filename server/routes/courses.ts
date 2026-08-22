import { Router, Response } from "express";
import { db } from "../db";
import { courses, modules, lessons, courseEnrollments } from "@shared/schema";
import { eq, and, asc, or } from "drizzle-orm";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";

export const coursesRouter = Router();
coursesRouter.use(requireAuth);

// ── IMPORTANT: specific routes BEFORE /:id to avoid Express matching "module"
// and "lesson" as an ID ────────────────────────────────────────────────────────

// GET /api/v1/courses/module/:moduleId
coursesRouter.get("/module/:moduleId", async (req: AuthRequest, res: Response) => {
  const [mod] = await db
    .select()
    .from(modules)
    .where(eq(modules.id, req.params.moduleId))
    .limit(1);

  if (!mod) return res.status(404).json({ error: "Module not found" });

  const modLessons = await db
    .select()
    .from(lessons)
    .where(eq(lessons.moduleId, mod.id))
    .orderBy(asc(lessons.sortOrder));

  res.json({ ...mod, lessons: modLessons });
});

// GET /api/v1/courses/lesson/:lessonId
coursesRouter.get("/lesson/:lessonId", async (req: AuthRequest, res: Response) => {
  const [lesson] = await db
    .select()
    .from(lessons)
    .where(eq(lessons.id, req.params.lessonId))
    .limit(1);

  if (!lesson) return res.status(404).json({ error: "Lesson not found" });
  res.json(lesson);
});

// GET /api/v1/courses  — list published courses (workers) or all (admin/trainer)
coursesRouter.get("/", async (req: AuthRequest, res: Response) => {
  const { category } = req.query;
  const isAdmin = req.user!.role === "admin" || req.user!.role === "trainer";

  // Admins see all courses; workers only see published ones
  const publishedFilter = isAdmin ? undefined : eq(courses.isPublished, true);
  const categoryFilter = category
    ? eq(courses.category, category as any)
    : undefined;

  const conditions = [publishedFilter, categoryFilter].filter(Boolean);
  const where = conditions.length > 1
    ? and(...(conditions as any))
    : conditions[0];

  const result = await db
    .select({
      id: courses.id,
      slug: courses.slug,
      title: courses.title,
      titleHi: courses.titleHi,
      description: courses.description,
      descriptionHi: courses.descriptionHi,
      category: courses.category,
      difficulty: courses.difficulty,
      thumbnailUrl: courses.thumbnailUrl,
      durationMinutes: courses.durationMinutes,
      isPublished: courses.isPublished,
    })
    .from(courses)
    .where(where)
    .orderBy(asc(courses.sortOrder));

  const enrollments = await db
    .select({
      courseId: courseEnrollments.courseId,
      completionPercent: courseEnrollments.completionPercent,
      completedAt: courseEnrollments.completedAt,
    })
    .from(courseEnrollments)
    .where(eq(courseEnrollments.userId, req.user!.id));

  const enrollMap = new Map(enrollments.map((e) => [e.courseId, e]));

  res.json(
    result.map((c) => ({
      ...c,
      enrolled: enrollMap.has(c.id),
      completionPercent: enrollMap.get(c.id)?.completionPercent ?? 0,
      completedAt: enrollMap.get(c.id)?.completedAt ?? null,
    }))
  );
});

// GET /api/v1/courses/:id — course detail with modules+lessons
coursesRouter.get("/:id", async (req: AuthRequest, res: Response) => {
  const isAdmin = req.user!.role === "admin" || req.user!.role === "trainer";

  // Admins can view draft courses; workers only see published
  const where = isAdmin
    ? eq(courses.id, req.params.id)
    : and(eq(courses.id, req.params.id), eq(courses.isPublished, true));

  const [course] = await db.select().from(courses).where(where).limit(1);
  if (!course) return res.status(404).json({ error: "Course not found" });

  const courseModules = await db
    .select()
    .from(modules)
    .where(eq(modules.courseId, course.id))
    .orderBy(asc(modules.sortOrder));

  const modulesWithLessons = await Promise.all(
    courseModules.map(async (mod) => {
      const modLessons = await db
        .select({
          id: lessons.id,
          title: lessons.title,
          titleHi: lessons.titleHi,
          contentType: lessons.contentType,
          videoUrl: lessons.videoUrl,
          videoProvider: lessons.videoProvider,
          videoDurationSeconds: lessons.videoDurationSeconds,
          sortOrder: lessons.sortOrder,
          isRequired: lessons.isRequired,
        })
        .from(lessons)
        .where(eq(lessons.moduleId, mod.id))
        .orderBy(asc(lessons.sortOrder));
      return { ...mod, lessons: modLessons };
    })
  );

  const [enrollment] = await db
    .select()
    .from(courseEnrollments)
    .where(
      and(
        eq(courseEnrollments.userId, req.user!.id),
        eq(courseEnrollments.courseId, course.id)
      )
    )
    .limit(1);

  res.json({ ...course, modules: modulesWithLessons, enrollment: enrollment || null });
});

// POST /api/v1/courses/:id/enroll
coursesRouter.post("/:id/enroll", async (req: AuthRequest, res: Response) => {
  const [course] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(and(eq(courses.id, req.params.id), eq(courses.isPublished, true)))
    .limit(1);

  if (!course) return res.status(404).json({ error: "Course not found" });

  const [existing] = await db
    .select()
    .from(courseEnrollments)
    .where(
      and(
        eq(courseEnrollments.userId, req.user!.id),
        eq(courseEnrollments.courseId, course.id)
      )
    )
    .limit(1);

  if (existing) return res.status(409).json({ error: "Already enrolled" });

  const [enrollment] = await db
    .insert(courseEnrollments)
    .values({ userId: req.user!.id, courseId: course.id })
    .returning();

  res.status(201).json(enrollment);
});

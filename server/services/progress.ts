import { db } from "../db";
import {
  lessons,
  lessonProgress,
  moduleProgress,
  modules,
  quizzes,
  courseEnrollments,
  certificates,
} from "@shared/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { generateCertificateNumber } from "./certificate";

/**
 * Single source of truth for "is this module complete".
 *
 * A module counts as complete only when ALL of its required lessons are
 * marked done AND — if the module has a quiz — that quiz has been passed.
 * Call this after (a) a lesson is marked completed, and (b) every quiz
 * submission. Nothing outside this function should ever set
 * moduleProgress.completedAt directly, or the two paths can disagree again.
 */
export async function evaluateModuleCompletion(
  userId: string,
  moduleId: string
): Promise<boolean> {
  const allLessons = await db
    .select({ id: lessons.id, isRequired: lessons.isRequired })
    .from(lessons)
    .where(eq(lessons.moduleId, moduleId));

  const requiredIds = allLessons.filter((l) => l.isRequired).map((l) => l.id);

  let lessonsDone = true;
  if (requiredIds.length > 0) {
    const done = await db
      .select({ lessonId: lessonProgress.lessonId })
      .from(lessonProgress)
      .where(
        and(
          eq(lessonProgress.userId, userId),
          eq(lessonProgress.completed, true),
          inArray(lessonProgress.lessonId, requiredIds)
        )
      );
    lessonsDone = done.length === requiredIds.length;
  }

  const [quiz] = await db
    .select({ id: quizzes.id })
    .from(quizzes)
    .where(eq(quizzes.moduleId, moduleId))
    .limit(1);

  let quizSatisfied = true;
  if (quiz) {
    const [mp] = await db
      .select({ quizPassed: moduleProgress.quizPassed })
      .from(moduleProgress)
      .where(
        and(eq(moduleProgress.userId, userId), eq(moduleProgress.moduleId, moduleId))
      )
      .limit(1);
    quizSatisfied = mp?.quizPassed === true;
  }

  if (!lessonsDone || !quizSatisfied) return false;

  const [existing] = await db
    .select({ completedAt: moduleProgress.completedAt })
    .from(moduleProgress)
    .where(
      and(eq(moduleProgress.userId, userId), eq(moduleProgress.moduleId, moduleId))
    )
    .limit(1);

  // Only set completedAt once
  if (!existing?.completedAt) {
    await db
      .insert(moduleProgress)
      .values({ userId, moduleId, completedAt: new Date() })
      .onConflictDoUpdate({
        target: [moduleProgress.userId, moduleProgress.moduleId],
        set: { completedAt: new Date() },
      });
  }

  await updateCourseCompletionPercent(userId, moduleId);
  return true;
}

async function updateCourseCompletionPercent(userId: string, moduleId: string) {
  const [mod] = await db
    .select({ courseId: modules.courseId })
    .from(modules)
    .where(eq(modules.id, moduleId))
    .limit(1);
  if (!mod) return;

  const allMods = await db
    .select({ id: modules.id })
    .from(modules)
    .where(eq(modules.courseId, mod.courseId));

  const completedMods = await db
    .select({ moduleId: moduleProgress.moduleId })
    .from(moduleProgress)
    .where(and(eq(moduleProgress.userId, userId), sql`completed_at IS NOT NULL`));

  const completedSet = new Set(completedMods.map((m) => m.moduleId));
  const pct =
    allMods.length > 0
      ? Math.round(
          (allMods.filter((m) => completedSet.has(m.id)).length / allMods.length) * 100
        )
      : 0;

  await db
    .update(courseEnrollments)
    .set({
      completionPercent: pct,
      completedAt: pct === 100 ? new Date() : undefined,
    })
    .where(
      and(
        eq(courseEnrollments.userId, userId),
        eq(courseEnrollments.courseId, mod.courseId)
      )
    );

  // Issue certificate on 100%
  if (pct === 100) {
    const [existingCert] = await db
      .select({ id: certificates.id })
      .from(certificates)
      .where(
        and(eq(certificates.userId, userId), eq(certificates.courseId, mod.courseId))
      )
      .limit(1);

    if (!existingCert) {
      await db.insert(certificates).values({
        userId,
        courseId: mod.courseId,
        certificateNumber: generateCertificateNumber(),
      });
    }
  }
}

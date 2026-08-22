import { Router, Response } from "express";
import { db } from "../db";
import {
  quizzes,
  quizQuestions,
  quizAttempts,
  moduleProgress,
  createQuizSchema,
} from "@shared/schema";
import { eq, and, asc } from "drizzle-orm";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";
import { z } from "zod";

export const quizRouter = Router();
quizRouter.use(requireAuth);

// GET /api/v1/quiz/module/:moduleId — get quiz (no correct answers exposed)
quizRouter.get("/module/:moduleId", async (req: AuthRequest, res: Response) => {
  const [quiz] = await db
    .select()
    .from(quizzes)
    .where(eq(quizzes.moduleId, req.params.moduleId))
    .limit(1);

  if (!quiz) return res.status(404).json({ error: "No quiz found for this module" });

  const questions = await db
    .select({
      id: quizQuestions.id,
      question: quizQuestions.question,
      questionHi: quizQuestions.questionHi,
      options: quizQuestions.options,
      optionsHi: quizQuestions.optionsHi,
      sortOrder: quizQuestions.sortOrder,
      // correctIndex intentionally omitted
    })
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quiz.id))
    .orderBy(asc(quizQuestions.sortOrder));

  res.json({
    quiz: { id: quiz.id, title: quiz.title, passingScore: quiz.passingScore },
    questions,
  });
});

// POST /api/v1/quiz/:quizId/submit
quizRouter.post("/:quizId/submit", async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    answers: z.array(z.number().int().min(0).max(3)),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });

  const [quiz] = await db
    .select()
    .from(quizzes)
    .where(eq(quizzes.id, req.params.quizId))
    .limit(1);

  if (!quiz) return res.status(404).json({ error: "Quiz not found" });

  const questions = await db
    .select({
      id: quizQuestions.id,
      correctIndex: quizQuestions.correctIndex,
      explanation: quizQuestions.explanation,
      explanationHi: quizQuestions.explanationHi,
    })
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quiz.id))
    .orderBy(asc(quizQuestions.sortOrder));

  const { answers } = result.data;
  if (answers.length !== questions.length) {
    return res.status(400).json({ error: `Expected ${questions.length} answers, got ${answers.length}` });
  }

  let correct = 0;
  const feedback = questions.map((q, i) => {
    const isCorrect = answers[i] === q.correctIndex;
    if (isCorrect) correct++;
    return {
      questionId: q.id,
      yourAnswer: answers[i],
      correctAnswer: q.correctIndex,
      isCorrect,
      explanation: q.explanation,
      explanationHi: q.explanationHi,
    };
  });

  const score = Math.round((correct / questions.length) * 100);
  const passed = score >= quiz.passingScore;

  const [attempt] = await db
    .insert(quizAttempts)
    .values({
      userId: req.user!.id,
      quizId: quiz.id,
      answers,
      score,
      passed,
    })
    .returning();

  await db
    .insert(moduleProgress)
    .values({
      userId: req.user!.id,
      moduleId: quiz.moduleId,
      quizScore: score,
      quizPassed: passed,
      completedAt: passed ? new Date() : undefined,
    })
    .onConflictDoUpdate({
      target: [moduleProgress.userId, moduleProgress.moduleId],
      set: {
        quizScore: score,
        quizPassed: passed,
        completedAt: passed ? new Date() : undefined,
      },
    });

  res.json({ score, passed, passingScore: quiz.passingScore, feedback, attempt });
});

// GET /api/v1/quiz/:quizId/attempts — user's attempt history
quizRouter.get("/:quizId/attempts", async (req: AuthRequest, res: Response) => {
  const attempts = await db
    .select({
      id: quizAttempts.id,
      score: quizAttempts.score,
      passed: quizAttempts.passed,
      attemptedAt: quizAttempts.attemptedAt,
    })
    .from(quizAttempts)
    .where(
      and(
        eq(quizAttempts.userId, req.user!.id),
        eq(quizAttempts.quizId, req.params.quizId)
      )
    );

  res.json(attempts);
});

// POST /api/v1/quiz/admin/module/:moduleId — create quiz (admin only)
quizRouter.post(
  "/admin/module/:moduleId",
  requireRole("admin"),
  async (req: AuthRequest, res: Response) => {
    const result = createQuizSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: result.error.flatten() });

    const { title, passingScore, questions } = result.data;

    const [quiz] = await db
      .insert(quizzes)
      .values({ moduleId: req.params.moduleId, title, passingScore: passingScore ?? 70 })
      .returning();

    if (questions.length > 0) {
      await db.insert(quizQuestions).values(
        questions.map((q, i) => ({
          quizId: quiz.id,
          question: q.question,
          questionHi: q.questionHi,
          options: q.options,
          optionsHi: q.optionsHi,
          correctIndex: q.correctIndex,
          explanation: q.explanation,
          explanationHi: q.explanationHi,
          sortOrder: i,
        }))
      );
    }

    res.status(201).json(quiz);
  }
);

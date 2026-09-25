import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { z } from "zod";

// ─── Enums ────────────────────────────────────────────────────────────────────
export const roleEnum = pgEnum("role", ["admin", "trainer", "worker"]);
export const categoryEnum = pgEnum("category", [
  "safety",
  "basics",
  "tools",
  "discipline",
  "electrical",
  "plumbing",
  "masonry",
  "equipment",
]);
export const difficultyEnum = pgEnum("difficulty", [
  "beginner",
  "intermediate",
  "advanced",
]);
export const contentTypeEnum = pgEnum("content_type", [
  "video",
  "text",
  "image",
  "quiz",
]);
export const langEnum = pgEnum("lang", ["en", "hi"]);

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = pgTable(
  "users",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    username: text("username").notNull().unique(),
    email: text("email").unique(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name").notNull().default("Worker"),
    role: roleEnum("role").notNull().default("worker"),
    avatarUrl: text("avatar_url"),
    phoneNumber: text("phone_number"),
    preferredLang: langEnum("preferred_lang").notNull().default("en"),
    expoPushToken: text("expo_push_token"),
    isActive: boolean("is_active").notNull().default(true),
    passwordResetTokenHash: text("password_reset_token_hash"),
    passwordResetExpiresAt: timestamp("password_reset_expires_at"),
    createdAt: timestamp("created_at").notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
    lastLoginAt: timestamp("last_login_at"),
  },
  (t) => ({
    usernameIdx: index("users_username_idx").on(t.username),
    emailIdx: index("users_email_idx").on(t.email),
  })
);

// ─── Courses ──────────────────────────────────────────────────────────────────
export const courses = pgTable(
  "courses",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    titleHi: text("title_hi"),
    description: text("description").notNull(),
    descriptionHi: text("description_hi"),
    category: categoryEnum("category").notNull(),
    difficulty: difficultyEnum("difficulty").notNull().default("beginner"),
    thumbnailUrl: text("thumbnail_url"),
    durationMinutes: integer("duration_minutes").notNull().default(0),
    isPublished: boolean("is_published").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdBy: varchar("created_by", { length: 36 }).references(
      () => users.id
    ),
    createdAt: timestamp("created_at").notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
  },
  (t) => ({
    categoryIdx: index("courses_category_idx").on(t.category),
    publishedIdx: index("courses_published_idx").on(t.isPublished),
  })
);

// ─── Modules ──────────────────────────────────────────────────────────────────
export const modules = pgTable(
  "modules",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    courseId: varchar("course_id", { length: 36 })
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    titleHi: text("title_hi"),
    description: text("description"),
    descriptionHi: text("description_hi"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().default(sql`now()`),
  },
  (t) => ({
    courseIdx: index("modules_course_idx").on(t.courseId),
  })
);

// ─── Lessons ──────────────────────────────────────────────────────────────────
export const lessons = pgTable(
  "lessons",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    moduleId: varchar("module_id", { length: 36 })
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    titleHi: text("title_hi"),
    contentType: contentTypeEnum("content_type").notNull(),
    videoUrl: text("video_url"),
    videoProvider: text("video_provider"), // "youtube" | "cloudinary" | "s3" | "local"
    videoDurationSeconds: integer("video_duration_seconds"),
    content: text("content"), // Markdown
    contentHi: text("content_hi"),
    imageUrl: text("image_url"),
    sortOrder: integer("sort_order").notNull().default(0),
    isRequired: boolean("is_required").notNull().default(true),
    createdAt: timestamp("created_at").notNull().default(sql`now()`),
  },
  (t) => ({
    moduleIdx: index("lessons_module_idx").on(t.moduleId),
  })
);

// ─── Quizzes ──────────────────────────────────────────────────────────────────
export const quizzes = pgTable("quizzes", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  moduleId: varchar("module_id", { length: 36 })
    .notNull()
    .references(() => modules.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  passingScore: integer("passing_score").notNull().default(70),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const quizQuestions = pgTable("quiz_questions", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  quizId: varchar("quiz_id", { length: 36 })
    .notNull()
    .references(() => quizzes.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  questionHi: text("question_hi"),
  options: jsonb("options").notNull().$type<string[]>(),
  optionsHi: jsonb("options_hi").$type<string[]>(),
  correctIndex: integer("correct_index").notNull(),
  explanation: text("explanation"),
  explanationHi: text("explanation_hi"),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ─── Progress Tracking ────────────────────────────────────────────────────────
export const lessonProgress = pgTable(
  "lesson_progress",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonId: varchar("lesson_id", { length: 36 })
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    completed: boolean("completed").notNull().default(false),
    videoProgressSeconds: integer("video_progress_seconds")
      .notNull()
      .default(0),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
  },
  (t) => ({
    userLessonIdx: uniqueIndex("lesson_progress_user_lesson_idx").on(
      t.userId,
      t.lessonId
    ),
    userIdx: index("lesson_progress_user_idx").on(t.userId),
  })
);

export const moduleProgress = pgTable(
  "module_progress",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    moduleId: varchar("module_id", { length: 36 })
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at").notNull().default(sql`now()`),
    completedAt: timestamp("completed_at"),
    quizScore: integer("quiz_score"),
    quizPassed: boolean("quiz_passed"),
  },
  (t) => ({
    userModuleIdx: uniqueIndex("module_progress_user_module_idx").on(
      t.userId,
      t.moduleId
    ),
  })
);

export const courseEnrollments = pgTable(
  "course_enrollments",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: varchar("course_id", { length: 36 })
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    enrolledAt: timestamp("enrolled_at").notNull().default(sql`now()`),
    completedAt: timestamp("completed_at"),
    completionPercent: real("completion_percent").notNull().default(0),
  },
  (t) => ({
    userCourseIdx: uniqueIndex("enrollment_user_course_idx").on(
      t.userId,
      t.courseId
    ),
  })
);

// ─── Certificates ─────────────────────────────────────────────────────────────
export const certificates = pgTable(
  "certificates",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: varchar("course_id", { length: 36 })
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    certificateNumber: text("certificate_number").notNull().unique(),
    earnedAt: timestamp("earned_at").notNull().default(sql`now()`),
    pdfUrl: text("pdf_url"),
  },
  (t) => ({
    userIdx: index("certificates_user_idx").on(t.userId),
  })
);

// ─── Quiz Attempts ────────────────────────────────────────────────────────────
export const quizAttempts = pgTable("quiz_attempts", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id),
  quizId: varchar("quiz_id", { length: 36 })
    .notNull()
    .references(() => quizzes.id),
  answers: jsonb("answers").notNull().$type<number[]>(),
  score: integer("score").notNull(),
  passed: boolean("passed").notNull(),
  attemptedAt: timestamp("attempted_at").notNull().default(sql`now()`),
});

// ─── Refresh Tokens ───────────────────────────────────────────────────────────
export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().default(sql`now()`),
  },
  (t) => ({
    tokenIdx: index("refresh_tokens_hash_idx").on(t.tokenHash),
  })
);

// ─── Relations ────────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  enrollments: many(courseEnrollments),
  lessonProgress: many(lessonProgress),
  moduleProgress: many(moduleProgress),
  certificates: many(certificates),
  quizAttempts: many(quizAttempts),
}));

export const coursesRelations = relations(courses, ({ many }) => ({
  modules: many(modules),
  enrollments: many(courseEnrollments),
  certificates: many(certificates),
}));

export const modulesRelations = relations(modules, ({ one, many }) => ({
  course: one(courses, {
    fields: [modules.courseId],
    references: [courses.id],
  }),
  lessons: many(lessons),
  quizzes: many(quizzes),
  progress: many(moduleProgress),
}));

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  module: one(modules, {
    fields: [lessons.moduleId],
    references: [modules.id],
  }),
  progress: many(lessonProgress),
}));

export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  module: one(modules, {
    fields: [quizzes.moduleId],
    references: [modules.id],
  }),
  questions: many(quizQuestions),
  attempts: many(quizAttempts),
}));

// ─── Zod validation schemas ───────────────────────────────────────────────────
export const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Min 3 characters")
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers and underscore"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z.string().min(1).max(60),
  email: z.string().email().optional(),
  phoneNumber: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/)
    .optional(),
  preferredLang: z.enum(["en", "hi"]).optional(),
});

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().min(6).max(12),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const createCourseSchema = z.object({
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and hyphens only"),
  title: z.string().min(2),
  titleHi: z.string().optional(),
  description: z.string().min(10),
  descriptionHi: z.string().optional(),
  category: z.enum([
    "safety",
    "basics",
    "tools",
    "discipline",
    "electrical",
    "plumbing",
    "masonry",
    "equipment",
  ]),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  thumbnailUrl: z.string().url().optional(),
});

export const createModuleSchema = z.object({
  title: z.string().min(2),
  titleHi: z.string().optional(),
  description: z.string().optional(),
  descriptionHi: z.string().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const createLessonSchema = z.object({
  title: z.string().min(2),
  titleHi: z.string().optional(),
  contentType: z.enum(["video", "text", "image", "quiz"]),
  videoUrl: z.string().url().optional(),
  videoProvider: z.enum(["youtube", "cloudinary", "s3", "local"]).optional(),
  videoDurationSeconds: z.number().int().positive().optional(),
  content: z.string().optional(),
  contentHi: z.string().optional(),
  imageUrl: z.string().url().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isRequired: z.boolean().optional(),
});

export const createQuizSchema = z.object({
  title: z.string().min(2),
  passingScore: z.number().int().min(1).max(100).optional(),
  questions: z.array(
    z.object({
      question: z.string().min(5),
      questionHi: z.string().optional(),
      options: z.array(z.string()).length(4),
      optionsHi: z.array(z.string()).length(4).optional(),
      correctIndex: z.number().int().min(0).max(3),
      explanation: z.string().optional(),
      explanationHi: z.string().optional(),
    })
  ),
});

// ─── Types ────────────────────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Course = typeof courses.$inferSelect;
export type InsertCourse = typeof courses.$inferInsert;
export type Module = typeof modules.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type Quiz = typeof quizzes.$inferSelect;
export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type Certificate = typeof certificates.$inferSelect;
export type LessonProgress = typeof lessonProgress.$inferSelect;
export type ModuleProgress = typeof moduleProgress.$inferSelect;
export type CourseEnrollment = typeof courseEnrollments.$inferSelect;
export type QuizAttempt = typeof quizAttempts.$inferSelect;

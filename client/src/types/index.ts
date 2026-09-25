// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role: "admin" | "trainer" | "worker";
  preferredLang: "en" | "hi";
  avatarUrl?: string;
  phoneNumber?: string;
  email?: string;
  createdAt?: string;
}

// ─── Courses ──────────────────────────────────────────────────────────────────
export type Category =
  | "safety"
  | "basics"
  | "tools"
  | "discipline"
  | "electrical"
  | "plumbing"
  | "masonry"
  | "equipment";

export type Difficulty = "beginner" | "intermediate" | "advanced";
export type ContentType = "video" | "text" | "image" | "quiz";
export type Lang = "en" | "hi";

export interface Course {
  id: string;
  slug: string;
  title: string;
  titleHi?: string;
  description: string;
  descriptionHi?: string;
  category: Category;
  difficulty: Difficulty;
  thumbnailUrl?: string;
  durationMinutes: number;
  enrolled: boolean;
  completionPercent: number;
  completedAt?: string | null;
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  titleHi?: string;
  description?: string;
  descriptionHi?: string;
  sortOrder: number;
  lessons: Lesson[];
}

export interface CourseDetail extends Omit<Course, "enrolled" | "completionPercent"> {
  modules: CourseModule[];
  enrollment: Enrollment | null;
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  titleHi?: string;
  contentType: ContentType;
  videoUrl?: string;
  videoProvider?: "youtube" | "cloudinary" | "s3" | "local";
  videoDurationSeconds?: number;
  content?: string;
  contentHi?: string;
  imageUrl?: string;
  sortOrder: number;
  isRequired: boolean;
}

// ─── Progress ─────────────────────────────────────────────────────────────────
export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: string;
  completedAt?: string | null;
  completionPercent: number;
}

export interface LessonProgress {
  lessonId: string;
  completed: boolean;
  videoProgressSeconds: number;
  completedAt?: string | null;
}

export interface ModuleProgress {
  moduleId: string;
  startedAt: string;
  completedAt?: string | null;
  quizScore?: number | null;
  quizPassed?: boolean | null;
}

export interface UserStats {
  modulesCompleted: number;
  lessonsCompleted: number;
  certificatesEarned: number;
  coursesEnrolled: number;
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────
export interface QuizQuestion {
  id: string;
  question: string;
  questionHi?: string;
  options: string[];
  optionsHi?: string[];
  sortOrder: number;
}

export interface QuizData {
  quiz: { id: string; title: string; passingScore: number };
  questions: QuizQuestion[];
}

export interface QuizFeedback {
  questionId: string;
  yourAnswer: number;
  correctAnswer: number;
  isCorrect: boolean;
  explanation?: string;
  explanationHi?: string;
}

export interface QuizResult {
  score: number;
  passed: boolean;
  passingScore: number;
  feedback: QuizFeedback[];
  certificate?: Certificate | null;
}

// ─── Certificates ─────────────────────────────────────────────────────────────
export interface Certificate {
  id: string;
  certificateNumber: string;
  courseTitle: string;
  courseTitleHi?: string;
  courseCategory: Category;
  earnedAt: string;
  pdfUrl?: string;
}

// ─── Navigation ──────────────────────────────────────────────────────────────
export type RootStackParamList = {
  Tabs: undefined;
  CourseDetail: { courseId: string };
  ModuleDetail: { moduleId: string };
  LessonDetail: { lessonId: string };
  Quiz: { moduleId: string };
  Search: undefined;
  ChangePassword: undefined;
};

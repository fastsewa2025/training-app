-- ─────────────────────────────────────────────────────────────────────────────
-- FastSewa Training — Initial Database Schema
-- Run with: psql $DATABASE_URL -f migrations/0000_initial_schema.sql
-- Or use:   npm run db:push   (Drizzle handles it automatically)
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Enums ─────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE role           AS ENUM ('admin', 'trainer', 'worker');
  CREATE TYPE category       AS ENUM ('safety','basics','tools','discipline','electrical','plumbing','masonry','equipment');
  CREATE TYPE difficulty     AS ENUM ('beginner','intermediate','advanced');
  CREATE TYPE content_type   AS ENUM ('video','text','image','quiz');
  CREATE TYPE lang           AS ENUM ('en','hi');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid(),
  username        TEXT         NOT NULL UNIQUE,
  email           TEXT         UNIQUE,
  password_hash   TEXT         NOT NULL,
  display_name    TEXT         NOT NULL DEFAULT 'Worker',
  role            role         NOT NULL DEFAULT 'worker',
  avatar_url      TEXT,
  phone_number    TEXT,
  preferred_lang  lang         NOT NULL DEFAULT 'en',
  expo_push_token TEXT,
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  last_login_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS users_username_idx ON users(username);
CREATE INDEX IF NOT EXISTS users_email_idx    ON users(email);

-- ── Courses ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
  id               VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             TEXT         NOT NULL UNIQUE,
  title            TEXT         NOT NULL,
  title_hi         TEXT,
  description      TEXT         NOT NULL,
  description_hi   TEXT,
  category         category     NOT NULL,
  difficulty       difficulty   NOT NULL DEFAULT 'beginner',
  thumbnail_url    TEXT,
  duration_minutes INTEGER      NOT NULL DEFAULT 0,
  is_published     BOOLEAN      NOT NULL DEFAULT FALSE,
  sort_order       INTEGER      NOT NULL DEFAULT 0,
  created_by       VARCHAR(36)  REFERENCES users(id),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS courses_category_idx  ON courses(category);
CREATE INDEX IF NOT EXISTS courses_published_idx ON courses(is_published);

-- ── Modules ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS modules (
  id              VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id       VARCHAR(36) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title           TEXT        NOT NULL,
  title_hi        TEXT,
  description     TEXT,
  description_hi  TEXT,
  sort_order      INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS modules_course_idx ON modules(course_id);

-- ── Lessons ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lessons (
  id                    VARCHAR(36)   PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id             VARCHAR(36)   NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title                 TEXT          NOT NULL,
  title_hi              TEXT,
  content_type          content_type  NOT NULL,
  video_url             TEXT,
  video_provider        TEXT,
  video_duration_seconds INTEGER,
  content               TEXT,
  content_hi            TEXT,
  image_url             TEXT,
  sort_order            INTEGER       NOT NULL DEFAULT 0,
  is_required           BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lessons_module_idx ON lessons(module_id);

-- ── Quizzes ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quizzes (
  id            VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id     VARCHAR(36) NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title         TEXT        NOT NULL,
  passing_score INTEGER     NOT NULL DEFAULT 70,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id             VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id        VARCHAR(36) NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question       TEXT        NOT NULL,
  question_hi    TEXT,
  options        JSONB       NOT NULL,   -- string[]
  options_hi     JSONB,
  correct_index  INTEGER     NOT NULL,
  explanation    TEXT,
  explanation_hi TEXT,
  sort_order     INTEGER     NOT NULL DEFAULT 0
);

-- ── Progress ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lesson_progress (
  id                    VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               VARCHAR(36) NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  lesson_id             VARCHAR(36) NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed             BOOLEAN     NOT NULL DEFAULT FALSE,
  video_progress_seconds INTEGER    NOT NULL DEFAULT 0,
  completed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS lesson_progress_user_idx ON lesson_progress(user_id);

CREATE TABLE IF NOT EXISTS module_progress (
  id           VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      VARCHAR(36) NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  module_id    VARCHAR(36) NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  quiz_score   INTEGER,
  quiz_passed  BOOLEAN,
  UNIQUE(user_id, module_id)
);

CREATE TABLE IF NOT EXISTS course_enrollments (
  id                 VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            VARCHAR(36) NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  course_id          VARCHAR(36) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at       TIMESTAMPTZ,
  completion_percent REAL        NOT NULL DEFAULT 0,
  UNIQUE(user_id, course_id)
);

-- ── Certificates ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS certificates (
  id                 VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            VARCHAR(36) NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  course_id          VARCHAR(36) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  certificate_number TEXT        NOT NULL UNIQUE,
  earned_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pdf_url            TEXT
);
CREATE INDEX IF NOT EXISTS certificates_user_idx ON certificates(user_id);

-- ── Quiz Attempts ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id           VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      VARCHAR(36) NOT NULL REFERENCES users(id),
  quiz_id      VARCHAR(36) NOT NULL REFERENCES quizzes(id),
  answers      JSONB       NOT NULL,   -- number[]
  score        INTEGER     NOT NULL,
  passed       BOOLEAN     NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Refresh Tokens ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT        NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS refresh_tokens_hash_idx ON refresh_tokens(token_hash);

-- ── Trigger: auto-update updated_at ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER users_updated_at    BEFORE UPDATE ON users    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  CREATE TRIGGER courses_updated_at  BEFORE UPDATE ON courses  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

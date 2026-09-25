# 🦺 FastSewa Training Platform

> Production-grade construction worker training app — Udemy for construction sites.
> **React Native (Expo)** mobile app + **Node.js/Express** API + **Admin Web Panel**

---

## ✨ Features

| Area | Feature |
|------|---------|
| 📱 **Mobile App** | React Native (Expo), iOS + Android |
| 🌐 **Languages** | English + हिन्दी (Hindi) — switchable per user |
| 🎓 **Training** | Courses → Modules → Lessons (video, text, image) |
| ▶️ **Video** | YouTube embed + Cloudinary/S3, with resume-from-where-you-left-off |
| ❓ **Quiz** | MCQ after each module, auto-scoring, Hindi explanations |
| 🏆 **Certificates** | Auto-issued PDF certificate on course completion |
| 🔐 **Auth** | JWT + bcrypt, refresh token rotation, role-based access |
| 👥 **Roles** | Admin / Trainer / Worker — different capabilities |
| 📊 **Admin Panel** | Web dashboard: courses CRUD, worker progress, analytics |
| 🔔 **Notifications** | Expo push notifications (iOS + Android) |
| 📶 **Offline** | AsyncStorage cache — view last-fetched data without internet |
| 🐳 **DevOps** | Docker + docker-compose, GitHub Actions CI/CD |
| 🚀 **Deploy** | Render.com (free tier ready) or DigitalOcean/AWS |

---

## 🏗️ Project Structure

```
fastsewa-training/
├── server/                  # Express API (Node.js + TypeScript)
│   ├── index.ts             # Entry point, middleware
│   ├── routes.ts            # Route registration + rate limiting
│   ├── db.ts                # PostgreSQL connection (Drizzle ORM)
│   ├── middleware/
│   │   └── auth.ts          # JWT verify, requireAuth, requireRole
│   ├── routes/
│   │   ├── auth.ts          # register, login, refresh, me
│   │   ├── courses.ts       # courses + module + lesson endpoints
│   │   ├── progress.ts      # lesson progress, video resume, stats
│   │   ├── quiz.ts          # MCQ submit + scoring
│   │   ├── certificates.ts  # list + PDF download
│   │   ├── admin.ts         # dashboard, worker management, CRUD
│   │   └── upload.ts        # Cloudinary/S3/local media upload
│   └── services/
│       ├── certificate.ts   # PDF generation (pdfkit)
│       ├── upload.ts        # Cloudinary + S3 + local
│       └── notification.ts  # Expo push notifications
│
├── shared/
│   └── schema.ts            # Drizzle schema + Zod validators (11 tables)
│
├── client/src/              # React Native (Expo) app
│   ├── App.tsx              # Root component
│   ├── navigation/
│   │   ├── RootStackNavigator.tsx
│   │   └── MainTabNavigator.tsx
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   ├── LearnScreen.tsx         # Course list + stats
│   │   ├── SearchScreen.tsx        # Full-text search
│   │   ├── CourseDetailScreen.tsx  # Enroll + modules
│   │   ├── ModuleDetailScreen.tsx  # Lessons list + quiz CTA
│   │   ├── LessonDetailScreen.tsx  # Video / text / image + resume
│   │   ├── QuizScreen.tsx          # MCQ with feedback
│   │   ├── TasksScreen.tsx         # All lessons as checklist
│   │   └── ProfileScreen.tsx       # Stats + certs + lang + logout
│   ├── components/
│   │   ├── ThemedText.tsx
│   │   ├── CourseCard.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── EmptyState.tsx
│   │   ├── LoadingScreen.tsx
│   │   └── ErrorBoundary.tsx
│   ├── hooks/
│   │   ├── useAuth.tsx
│   │   ├── useTheme.ts
│   │   ├── usePushNotifications.ts
│   │   └── useOfflineSync.ts
│   ├── i18n/index.ts        # English + Hindi translations
│   ├── lib/
│   │   ├── api.ts           # Typed HTTP client + auto token refresh
│   │   └── queryClient.ts   # React Query config
│   ├── constants/theme.ts   # Design tokens (worker-optimised)
│   └── types/index.ts       # Shared TypeScript interfaces
│
├── admin/
│   └── index.html           # Self-contained admin web panel (no build needed)
│
├── migrations/
│   └── 0000_initial_schema.sql
│
├── scripts/
│   ├── seed.ts              # Sample data (courses, quizzes, users)
│   └── create-admin.ts      # CLI admin user creation
│
├── nginx/
│   └── fastsewa.conf        # Production Nginx config
│
├── Dockerfile               # Multi-stage production build
├── docker-compose.yml       # postgres + redis + api
├── .env.example             # All env vars documented
├── eas.json                 # Expo EAS build profiles
├── DEPLOYMENT.md            # Step-by-step deploy guide
└── tsconfig.json
```

---

## 🚀 Quick Start (Local Dev)

### Prerequisites
- Node.js 20+
- PostgreSQL 14+ running locally
- (Optional) Docker for one-command stack

### 1. Install & Configure

```bash
git clone https://github.com/yourname/fastsewa-training.git
cd fastsewa-training
npm install
cp .env.example .env
```

Edit `.env` — at minimum set:
```env
# Free managed Postgres — sign up at neon.tech, create a project, paste
# its connection string here (see DEPLOYMENT.md "Database — Neon"):
DATABASE_URL=postgresql://<user>:<password>@<host>.neon.tech/<db>?sslmode=require
JWT_SECRET=any-long-random-string-here-at-least-32-chars
```

### 2. Push Schema

```bash
npm run db:push            # Drizzle creates all 12 tables in your database
```

### 3. Seed Sample Data

```bash
npm run seed
```

Creates:
- **Admin:** `admin` / `Admin@1234`
- **Worker:** `ramesh` / `Worker@123` (Hindi, phone set)
- 3 published courses (Safety, Tools, Electrical) with modules, lessons, quizzes

### 4. Start Development

```bash
npm run dev
```

- API: `http://localhost:5000`
- Expo: `http://localhost:8081` (scan QR with Expo Go)
- Admin panel: open `admin/index.html` in browser (set API URL to `http://localhost:5000`)

---

## 🐳 Docker (Full Stack)

```bash
cp .env.example .env
# Set: DB_PASSWORD, JWT_SECRET, ALLOWED_ORIGINS

docker compose up -d

# First time only:
docker compose exec api npm run db:push
docker compose exec api npm run seed

# Check health
curl http://localhost:5000/api/health
```

---

## 📱 Mobile App Build

```bash
npm install -g eas-cli
eas login
eas build:configure

# Android APK (for direct WhatsApp/QR distribution to workers)
eas build --platform android --profile preview

# Production build for Play Store
eas build --platform android --profile production
eas submit --platform android
```

Update `EXPO_PUBLIC_API_URL` in `eas.json` to point to your deployed API.

---

## 🌐 Admin Panel

Open `admin/index.html` directly in your browser. No build step needed.

Set the API URL in the login page or by editing the `FASTSEWA_API_URL` variable at the top of the file.

**Capabilities:**
- 📊 Dashboard (workers, courses, enrollments, completion rate)
- 📚 Courses CRUD (create, edit, publish/unpublish, delete)
- 🎬 Content Builder (add modules + lessons with video/text/image)
- 👷 Worker management (list, progress drill-down, certificates)

---

## 🔐 API Reference

All endpoints require `Authorization: Bearer <accessToken>` except `/auth/login` and `/auth/register`.

### Auth
| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | `/api/v1/auth/register` | Create worker account |
| POST | `/api/v1/auth/login` | Login, returns tokens |
| POST | `/api/v1/auth/refresh` | Rotate refresh token |
| POST | `/api/v1/auth/logout` | Invalidate refresh token |
| GET | `/api/v1/auth/me` | Current user |
| PATCH | `/api/v1/auth/me` | Update profile / language |

### Courses
| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/api/v1/courses` | List published courses (+ ?category=) |
| GET | `/api/v1/courses/:id` | Course detail + modules + lessons |
| GET | `/api/v1/courses/module/:id` | Module detail + lessons |
| GET | `/api/v1/courses/lesson/:id` | Single lesson (full content) |
| POST | `/api/v1/courses/:id/enroll` | Enroll in course |

### Progress
| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | `/api/v1/progress/lesson` | Save lesson progress + video resume point |
| GET | `/api/v1/progress/lesson/:id` | Get resume point for lesson |
| GET | `/api/v1/progress/all-lessons` | All lesson progress (for Tasks screen) |
| GET | `/api/v1/progress/stats` | Overall worker stats |

### Quiz
| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/api/v1/quiz/module/:moduleId` | Get quiz questions (no answers) |
| POST | `/api/v1/quiz/:quizId/submit` | Submit answers, get score + feedback |
| GET | `/api/v1/quiz/:quizId/attempts` | Attempt history |

### Certificates
| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/api/v1/certificates` | My certificates |
| GET | `/api/v1/certificates/:id/pdf` | Download PDF |

### Admin (requires admin/trainer role)
| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/api/v1/admin/dashboard` | Stats overview |
| GET/POST | `/api/v1/admin/courses` | List / create courses |
| PUT | `/api/v1/admin/courses/:id` | Update course |
| PATCH | `/api/v1/admin/courses/:id/publish` | Toggle publish |
| DELETE | `/api/v1/admin/courses/:id` | Delete course |
| POST | `/api/v1/admin/courses/:id/modules` | Add module |
| POST | `/api/v1/admin/modules/:id/lessons` | Add lesson |
| GET | `/api/v1/admin/workers` | List workers |
| GET | `/api/v1/admin/workers/:id/progress` | Worker progress + certs |

### Upload (admin/trainer only)
| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | `/api/v1/upload/image` | Upload image (returns URL) |
| POST | `/api/v1/upload/video` | Upload video (returns URL) |

---

## 🔑 Environment Variables

See `.env.example` for the full list. Required minimum:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=<32+ random chars>
NODE_ENV=production
```

---

## 🏗️ Database Schema (11 tables)

```
users ──────────────────────────────────────────────────┐
  └─ course_enrollments ←── courses ──┐                 │
  └─ lesson_progress   ←── lessons ←─┤                  │
  └─ module_progress   ←── modules ←─┤ courses          │
  └─ quiz_attempts     ←── quizzes ←─┤                  │
  └─ certificates      ←─────────────┘                  │
  └─ refresh_tokens                                      │
                         quiz_questions ←── quizzes ────┘
```

---

## 🛡️ Security

- Passwords hashed with **bcrypt (cost 12)**
- **JWT** with 15-minute access tokens + 30-day refresh tokens (rotated on use)
- **Timing-safe** login (prevents username enumeration)
- **Rate limiting**: 200 req/15min global, 15 req/15min on auth
- **Helmet.js** security headers
- **Strict CORS** — allowlist from environment variable only
- **Zod validation** on every API route
- All SQL via **parameterised queries** (Drizzle ORM — no raw SQL injection risk)

---

## 🚀 Deployment

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for full step-by-step guides for:
- Local development
- Docker Compose (staging / VPS)
- **Render.com** (recommended for MVP — free tier)
- **DigitalOcean** droplet with Nginx + SSL
- **Expo EAS** mobile builds

---

## 📦 Tech Stack

| Layer | Tech |
|-------|------|
| Mobile | React Native 0.81, Expo 54 |
| Navigation | React Navigation 7 |
| State | TanStack Query v5 |
| API | Express 5, TypeScript |
| Database | PostgreSQL 16, Drizzle ORM |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Validation | Zod |
| i18n | i18next, react-i18next |
| PDF | pdfkit |
| Media | Cloudinary / AWS S3 |
| Push | Expo Notifications |
| DevOps | Docker, GitHub Actions |
| Deploy | Render.com / DigitalOcean |

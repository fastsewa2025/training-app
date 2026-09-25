# FastSewa Training™ — Worker Training Platform

> **Bilingual (Hindi/English) skills & safety training for construction workers** — course library, video/text lessons, quizzes, and auto-issued certificates, built for low-connectivity job sites

FastSewa Training is the workforce-training arm of the FastSewa platform — a mobile-first learning system for onboarding and upskilling construction, electrical, and site-safety workers. Workers learn in their preferred language, trainers and admins author content and track progress from a lightweight web dashboard.

[![Status](https://img.shields.io/badge/Status-Launch%20Ready-2e7d32?style=for-the-badge)]()
[![Stack](https://img.shields.io/badge/Stack-Expo%20%2B%20Node%20%2B%20Postgres-0f172a?style=for-the-badge&logo=react)]()

---

## 🚀 Features

### For Workers
| Feature | Description |
|---|---|
| 📚 Course Library | Browse by category — Safety, Basics, Tools, Electrical, Plumbing, Masonry, Equipment |
| 🎥 Lessons | Video (YouTube or uploaded), text, and image content — every lesson in **English and Hindi** |
| ❓ Quizzes | Multiple-choice, auto-scored, with bilingual feedback — a module only counts as complete once its quiz is passed, not just watched |
| 🏆 Certificates | Auto-issued PDF certificate the moment a course hits 100% completion |
| 📈 Progress Tracking | Per-lesson, per-module, and per-course completion, visible on the home screen |
| 🌐 Offline Mode | Course list is cached locally — still browsable with no signal, with a clear "showing saved courses" indicator |
| 🔔 Push Notifications | Course reminders and admin broadcasts via Expo push |
| 🔑 Full Account Recovery | Email + code self-service reset, a separate change-password flow for logged-in users, and an admin-issued temporary-password fallback that needs no email at all |
| 🗣️ Language Toggle | Switch the whole app between Hindi and English anytime from the profile screen |

### For Admins / Trainers
| Feature | Description |
|---|---|
| 🧑‍🏫 Content Authoring | Create courses → modules → lessons → quizzes, each field bilingual, from the admin dashboard |
| 📊 Dashboard | Total workers, published courses, enrollments, completion rate at a glance |
| 👷 Worker Management | View every worker's progress, deactivate accounts, reset a worker's password directly |
| 📣 Broadcast | Push a notification to every registered device |
| 📈 Analytics | Enrollment counts per course |

---

## 📁 Project Structure

```
fastsewa-training/
├── client/                        # React Native / Expo mobile app (workers)
│   ├── App.tsx
│   └── src/
│       ├── screens/                # Login, Register, Forgot/Reset/Change-Password,
│       │                           # Learn (home), CourseDetail, ModuleDetail,
│       │                           # LessonDetail, Quiz, Search, Tasks, Profile
│       ├── components/             # ThemedText, ProgressBar, CourseCard...
│       ├── hooks/                  # useAuth, useTheme, useOfflineSync, usePushNotifications
│       ├── navigation/             # RootStackNavigator, MainTabNavigator
│       ├── lib/                    # api.ts — typed API client, token refresh
│       ├── i18n/                   # Bilingual EN/HI translation strings
│       └── types/                  # Shared client-side types
├── server/                         # Express API
│   ├── index.ts                    # Entry point, security middleware, static uploads
│   ├── routes.ts                   # Router wiring, rate limiting
│   ├── db.ts                       # Postgres connection (Neon/any managed provider)
│   ├── routes/                     # auth, courses, progress, quiz, certificates, admin, upload
│   ├── services/                   # certificate (PDF), email (SMTP), upload (Cloudinary/S3/local),
│   │                                # notification (push), progress (completion + cert logic)
│   ├── middleware/auth.ts
│   └── utils/params.ts
├── shared/schema.ts                # Drizzle schema + Zod validation — one source of truth,
│                                    # imported by both client and server
├── admin/index.html                # Admin dashboard — single file, no build step
├── migrations/                     # Drizzle migration history (+ meta/ journal for db:migrate)
├── scripts/
│   ├── seed.ts                     # Sample users, courses, quizzes
│   └── create-admin.ts
├── docker-compose.yml              # api + redis (local-db is an opt-in profile)
├── Dockerfile
├── .github/workflows/              # CI: typecheck → lint → build
├── DEPLOYMENT.md
└── .env.example
```

---

## 🛠️ Technologies Used

### Mobile Client
| Technology | Usage |
|---|---|
| **React Native + Expo (SDK 54)** | Cross-platform iOS/Android app |
| **TypeScript** | End-to-end type safety, shared types with the server |
| **React Navigation** | Stack + tab navigation |
| **TanStack Query** | Server-state caching for authenticated screens |
| **i18next** | Hindi/English translations |
| **AsyncStorage + NetInfo** | Offline course caching |
| **Expo Notifications** | Push notifications |

### Backend
| Technology | Usage |
|---|---|
| **Node.js + Express** | REST API |
| **PostgreSQL** | Primary database — any managed provider (Neon recommended, free tier) |
| **Drizzle ORM** | Schema, migrations, typed queries |
| **JWT (access + refresh)** | Auth, with refresh-token rotation and session invalidation on password change |
| **bcrypt** | Password hashing |
| **Zod** | Request validation, shared schema with the client |
| **Redis** *(optional)* | Shared rate-limit store across instances — the app runs fine without it, using an in-memory limiter instead |
| **Nodemailer (SMTP)** | Password-reset emails — works with any provider (Resend, Brevo, SES...); without it, reset codes log to the server console instead |
| **Cloudinary / AWS S3** | Video & image storage — falls back to local disk for dev, with a startup warning since local storage isn't durable across redeploys |

### Admin Dashboard
| Technology | Usage |
|---|---|
| **Plain HTML/CSS/JS** | No build step, no framework — one file |

### CI/CD
- GitHub Actions: type-check (`tsc --noEmit`) → lint (`eslint --max-warnings 0`) → Docker build, in that order
- Render (recommended) or Docker Compose for self-hosted/VPS deploys

---

## ⚙️ Getting Started

### Prerequisites
- Node.js 20+
- A Postgres database — a free [Neon](https://neon.tech) project takes about 2 minutes
- Expo CLI / EAS CLI (`npm install -g eas-cli`) for building the mobile app

### Local Development

```bash
# 1. Clone and install
git clone <your-repo-url> fastsewa-training
cd fastsewa-training
npm install

# 2. Environment
cp .env.example .env
# fill in: DATABASE_URL (your Neon connection string), JWT_SECRET (any long
# random string). Everything else — SMTP, Cloudinary/S3, Redis — is optional
# for local dev and degrades gracefully if left unset.

# 3. Schema + sample data
npm run db:push
npm run seed          # sample users/courses, or skip and author real content instead

# 4. Run the server
npm run dev
# -> http://localhost:5000/api/health

# 5. Run the mobile app (separate terminal)
npx expo start
# -> scan the QR code with Expo Go, or press i / a for a simulator

# 6. Admin dashboard
# open admin/index.html in a browser — for local dev it points at
# localhost:5000 by default; see the file's top for the config line
```

Create your first admin login:
```bash
npx tsx scripts/create-admin.ts you@example.com "SomeStrongPassword123"
```

---

## ✍️ Adding Content

All course content is authored from the **admin dashboard** by an admin or trainer account:

1. **Course** — title + description in both English and Hindi, category, difficulty
2. **Modules** — added inside a course, also bilingual
3. **Lessons** — added inside a module:
   - Video: paste a YouTube URL (simplest, free, reliable) or upload a file
   - Text or image content
   - Every lesson has English and Hindi fields
4. **Quiz** *(recommended per module)* — multiple-choice questions, 4 options each, bilingual, with a passing score. **If a module has a quiz, workers must pass it — watching the lessons alone won't mark the module complete.** Modules with no quiz complete on lesson-viewing alone.
5. **Publish** — a course is invisible to workers until this toggle is switched on

---

## 🚢 Deployment

Full step-by-step instructions — including the Neon database setup, environment variables, and three deployment paths (Render, Docker Compose, self-hosted) — are in **[`DEPLOYMENT.md`](./DEPLOYMENT.md)**.

Before onboarding real workers:
- [ ] `CLOUDINARY_CLOUD_NAME` / `AWS_S3_BUCKET` configured (uploaded videos won't survive a redeploy otherwise)
- [ ] `SMTP_*` configured, so forgot-password actually emails a code
- [ ] `eas init` run and a real EAS project ID set in `app.json`, for push notifications to work

---

## 👨‍💻 Developer Squad

**

---

## 🏢 About the Company

**Jha Ji Fastsewa E-Facilities Private Limited**
- 📍 B Hub, Gandhi Maidan, Patna, Bihar — 800001
- 📞 +91 82757 23755
- 📧 fastsewa2020@gmail.com
- 🌐 [fastsewa.com](https://fastsewa.com)

[![Facebook](https://img.shields.io/badge/Facebook-1877F2?style=flat&logo=facebook&logoColor=white)](https://facebook.com/fastsewa.20)
[![Instagram](https://img.shields.io/badge/Instagram-E4405F?style=flat&logo=instagram&logoColor=white)](https://www.instagram.com/fastsewa2020/)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=flat&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/fastsewa-facilities-2a062b2a2/)
[![WhatsApp](https://img.shields.io/badge/WhatsApp-25D366?style=flat&logo=whatsapp&logoColor=white)](https://wa.me/918275723755)

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

**Last Updated**: September 2026
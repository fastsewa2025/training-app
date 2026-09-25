# FastSewa Training — Deployment Guide

## Prerequisites
- Node.js 20+
- A Postgres database — a free Neon project takes ~2 minutes (see below);
  local Postgres 14+ only needed if you specifically want self-hosted
- Docker + Docker Compose (for containerised deploy)
- EAS CLI (`npm install -g eas-cli`) for mobile builds

---

## Database — Neon (recommended, use for all options below)

FastSewa needs one Postgres database, reachable by URL — that's all Drizzle
and `server/db.ts` require, so any managed provider works. We default to
**Neon** (neon.tech): generous free tier, no code changes, works no matter
where you host the API (Render, a VPS, anywhere).

1. Sign up at [neon.tech](https://neon.tech) and create a project (pick a
   region close to your users — e.g. Singapore for India).
2. Open the project's **Connection Details** and copy the connection
   string. It already includes `?sslmode=require` — use it as-is.
3. Put it in `.env` (or your host's environment variables) as `DATABASE_URL`.
4. Create the schema and load starter data:
   ```bash
   npm install
   npm run db:push        # creates all tables from shared/schema.ts
   npm run seed            # optional: sample courses/users to try it out
   ```
   `db:push` syncs the schema directly — good for getting started fast. If
   you'd rather track schema changes as versioned migration files (e.g. for
   a team, or a CI-gated deploy), `npm run db:migrate` runs the tracked
   files in `migrations/` instead; `npm run db:generate` creates a new one
   after you change `shared/schema.ts`. Both approaches produce the same
   schema — pick whichever fits your workflow.

Prefer Supabase, Render Postgres, or Railway instead? Same steps — just
paste their connection string as `DATABASE_URL`. Nothing else changes.

Only need Postgres running locally with no cloud account (e.g. offline
dev)? Skip this section and see **Option B**'s `local-db` profile below.

---

## Option A — Local Development

```bash
# 1. Clone and install
git clone https://github.com/yourname/fastsewa-training.git
cd fastsewa-training
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL (see "Database — Neon" above) and JWT_SECRET

# 3. Push schema to your database
npm run db:push

# 4. Seed sample data
npm run seed

# 5. Start both servers
npm run dev
# API runs on http://localhost:5000
# Expo runs on http://localhost:8081
```

---

## Option B — Docker Compose (Recommended for staging/VPS)

```bash
# 1. Set secrets
cp .env.example .env
# Required: DATABASE_URL (Neon — see above), JWT_SECRET, ALLOWED_ORIGINS
# REDIS_PASSWORD is also required — redis still runs by default (see
# note on Redis below); DB_PASSWORD is only needed if you use local-db.

# 2. Start everything (api + redis; uses the online DB from DATABASE_URL)
docker compose up -d

# 3. Push schema (first time only)
docker compose exec api npx drizzle-kit push

# 4. Seed
docker compose exec api npm run seed

# 5. Check health
curl http://localhost:5000/api/health
```

No cloud DB account, want Postgres self-hosted in the same stack instead?
```bash
docker compose --profile local-db up -d db   # start Postgres first
sleep 5
# set DATABASE_URL=postgresql://fastsewa:${DB_PASSWORD}@db:5432/fastsewa_db in .env
docker compose --profile local-db up -d
```

---

## Option C — Render.com (Free tier / Production)

### Backend

1. Go to [render.com](https://render.com) → New → Web Service
2. Connect your GitHub repo
3. Settings:
   | Field | Value |
   |-------|-------|
   | Name | fastsewa-api |
   | Region | Singapore (for India) |
   | Branch | main |
   | Runtime | Docker |
   | Dockerfile path | ./Dockerfile |
   | Port | 5000 |

4. Use the `DATABASE_URL` from your Neon project (see "Database — Neon"
   above). Prefer Render's own managed Postgres instead? Create it under
   Render → New → PostgreSQL (free tier) and copy its `DATABASE_URL` — both
   work identically here, this app doesn't care which you pick.
5. Add all variables from `.env.example` to the Web Service's Environment
   Variables.

### Environment Variables on Render
```
NODE_ENV=production
DATABASE_URL=<from Neon, or Render PostgreSQL if you used that instead>
JWT_SECRET=<generate: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
ALLOWED_ORIGINS=exp://your-expo-url,https://yourdomain.com
PORT=5000
```

---

## Option D — DigitalOcean Droplet ($12/mo, 2GB RAM)

```bash
# 1. Create Ubuntu 24.04 droplet, SSH in

# 2. Install Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER

# 3. Install Nginx + SSL
apt install nginx certbot python3-certbot-nginx -y

# 4. Clone app
git clone https://github.com/yourname/fastsewa-training.git /app
cd /app
cp .env.example .env
nano .env   # fill values

# 5. Start
docker compose up -d

# 6. Nginx config at /etc/nginx/sites-available/fastsewa
server {
    server_name api.yourdomain.com;
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# 7. SSL
certbot --nginx -d api.yourdomain.com
```

---

## Mobile App Build (Expo EAS)

```bash
# Install EAS CLI
npm install -g eas-cli
eas login

# Configure project (first time)
eas build:configure

# Build Android APK for direct install (construction site workers)
eas build --platform android --profile preview
# → Downloads APK, share via WhatsApp/QR code to workers

# Build for Play Store
eas build --platform android --profile production
eas submit --platform android

# Build for iOS
eas build --platform ios --profile production
eas submit --platform ios
```

### Update EXPO_PUBLIC_API_URL in eas.json
```json
"preview": {
  "env": {
    "EXPO_PUBLIC_API_URL": "https://fastsewa-api.onrender.com"
  }
}
```

---

## GitHub Actions Secrets Required

| Secret | Where to get |
|--------|-------------|
| `DOCKER_USERNAME` | Docker Hub account |
| `DOCKER_TOKEN` | Docker Hub → Account Settings → Access Tokens |
| `RENDER_API_KEY` | Render Dashboard → Account Settings → API Keys |
| `RENDER_SERVICE_ID` | Render service URL (srv-xxxxxxxx) |

---

## Post-Deploy Checklist

- [ ] `GET /api/health` returns `{"status":"ok"}`
- [ ] Register a worker account via mobile app
- [ ] Log in with admin / Admin@1234
- [ ] Create a course via `POST /api/v1/admin/courses`
- [ ] Verify quiz submit and certificate download
- [ ] Test Hindi language switch
- [ ] Verify video resume (seek video, close app, reopen)

---

## Scaling Notes

- For 100+ concurrent users: upgrade Render to Starter ($7/mo). Redis (rate-limit store) already runs via docker-compose; on Render specifically, add a Redis instance and set `REDIS_URL` if you want the shared limiter there too — without it, each instance just rate-limits independently, which is fine at smaller scale.
- For 1,000+ users: migrate to DigitalOcean Managed Database + Spaces CDN for video
- Videos >500MB: use Cloudinary or AWS S3 + CloudFront CDN

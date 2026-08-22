# FastSewa Training — Deployment Guide

## Prerequisites
- Node.js 20+
- PostgreSQL 14+
- Docker + Docker Compose (for containerised deploy)
- EAS CLI (`npm install -g eas-cli`) for mobile builds

---

## Option A — Local Development

```bash
# 1. Clone and install
git clone https://github.com/yourname/fastsewa-training.git
cd fastsewa-training
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL and JWT_SECRET at minimum

# 3. Create database and push schema
createdb fastsewa_db         # or use your Postgres GUI
npm run db:push

# 4. Seed sample data
npx tsx scripts/seed.ts

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
# Required: DB_PASSWORD, JWT_SECRET, ALLOWED_ORIGINS

# 2. Start everything
docker compose up -d

# 3. Push schema (first time only)
docker compose exec api npx drizzle-kit push

# 4. Seed
docker compose exec api npx tsx scripts/seed.ts

# 5. Check health
curl http://localhost:5000/api/health
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

4. Create a **PostgreSQL** database on Render (free tier)
5. Copy the `DATABASE_URL` from the Render DB dashboard into Environment Variables
6. Add all variables from `.env.example`

### Environment Variables on Render
```
NODE_ENV=production
DATABASE_URL=<from Render PostgreSQL>
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

- For 100+ concurrent users: upgrade Render to Starter ($7/mo) + add Redis for session caching
- For 1,000+ users: migrate to DigitalOcean Managed Database + Spaces CDN for video
- Videos >500MB: use Cloudinary or AWS S3 + CloudFront CDN

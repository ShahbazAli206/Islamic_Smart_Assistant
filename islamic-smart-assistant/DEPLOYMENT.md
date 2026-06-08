# Islamic Smart Assistant — Deployment Reference

Complete guide for the live deployment: endpoints, credentials locations, testing, and local development.

---

## Live Deployment URLs

| Service | URL | Platform |
|---|---|---|
| **Frontend (Web Dashboard)** | https://islamic-smart-assistant.vercel.app | Vercel (free) |
| **Backend (NestJS API)** | https://shahbaz206-islamic-assistant-backend.hf.space | Hugging Face Spaces (free) |
| **API Swagger Docs** | https://shahbaz206-islamic-assistant-backend.hf.space/v1/docs | Auto-generated |
| **Database** | `jqrflmqacliezkwmxqiv.supabase.co` | Supabase (free) |

---

## Backend API Endpoints

Base URL: `https://shahbaz206-islamic-assistant-backend.hf.space/v1`

All protected endpoints require: `Authorization: Bearer <access_token>`

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Register new user |
| POST | `/auth/login` | No | Login, returns access + refresh tokens |
| POST | `/auth/refresh` | No | Refresh access token |
| POST | `/auth/oauth/google` | No | Google OAuth login |
| POST | `/auth/oauth/apple` | No | Apple OAuth login |

### Users

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/users/me` | Yes | Get current user profile |
| PATCH | `/users/me` | Yes | Update profile (name, language, sect, fiqh) |
| POST | `/users/me/location` | Yes | Set user location (lat, lng, timezone) |

### Prayer Times

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/prayer-times?date=YYYY-MM-DD` | Yes | Get prayer times for a date |
| GET | `/prayer-times/range?from=YYYY-MM-DD&days=N` | Yes | Get prayer times for N days |
| GET | `/prayer-times/qibla` | Yes | Get Qibla direction bearing |

### Azan

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/azan/voices` | Yes | List all available Azan voices |
| GET | `/azan/settings` | Yes | Get user's Azan settings |
| PUT | `/azan/settings` | Yes | Update Azan settings (voice, delay, enabled prayers) |

### Quran

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/quran/surahs` | Yes | List all 114 surahs |
| GET | `/quran/surah/:id` | Yes | Get surah details |
| GET | `/quran/audio/:reciterId/:surahId` | Yes | Get audio URL for a surah |
| GET | `/quran/schedules` | Yes | List user's Quran schedules |
| POST | `/quran/schedules` | Yes | Create a new Quran schedule |
| DELETE | `/quran/schedules/:id` | Yes | Delete a Quran schedule |

### Devices

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/devices` | Yes | Register a device (for push + sync) |
| GET | `/devices` | Yes | List user's registered devices |
| PATCH | `/devices/:id` | Yes | Update device info |
| DELETE | `/devices/:id` | Yes | Remove a device |

### Notifications

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/notifications/test` | Yes | Send a test push notification |

### WebSocket

Connect to: `wss://shahbaz206-islamic-assistant-backend.hf.space/v1/sync`

Auth: pass token as query param `?token=<access_token>` or in `auth.token`

| Event (outbound) | Description |
|---|---|
| `azan.play` | Triggered at prayer time — play Azan on all devices |
| `quran.play` | Triggered by schedule — play Quran recitation |
| `settings.changed` | User settings updated on another device |
| `device.kicked` | This device was removed or auth failed |

| Event (inbound) | Description |
|---|---|
| `ping` | Heartbeat check |
| `playback.ack` | Device confirms playback played/failed |
| `presence` | Device reports battery/network status |

---

## Quick Test — Register & Login

Use curl or the Swagger UI at `/v1/docs`:

```bash
# 1. Register
curl -X POST https://shahbaz206-islamic-assistant-backend.hf.space/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!","name":"Test User"}'

# 2. Login — copy the access_token from response
curl -X POST https://shahbaz206-islamic-assistant-backend.hf.space/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!"}'

# 3. Set location (required before prayer times work)
curl -X POST https://shahbaz206-islamic-assistant-backend.hf.space/v1/users/me/location \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"lat":33.6844,"lng":73.0479,"timezone":"Asia/Karachi","city":"Islamabad","country":"PK"}'

# 4. Get today's prayer times
curl https://shahbaz206-islamic-assistant-backend.hf.space/v1/prayer-times \
  -H "Authorization: Bearer <access_token>"

# 5. Get Azan voices
curl https://shahbaz206-islamic-assistant-backend.hf.space/v1/azan/voices \
  -H "Authorization: Bearer <access_token>"
```

---

## Environment Variables

### HF Space (Backend) — set in Space Settings → Variables and secrets

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres.jqrflmqacliezkwmxqiv:[PASSWORD]@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres` | Use `%24` for `$` in password |
| `REDIS_URL` | `redis://localhost:6379` | Redis runs inside the container |
| `JWT_SECRET` | your-secret-key | Used for signing JWT tokens |
| `PORT` | `7860` | Required by Hugging Face Spaces |
| `NODE_ENV` | `production` | |
| `FCM_SERVICE_ACCOUNT_JSON_PATH` | *(optional)* | Path to Firebase service account for push notifications |

### Vercel (Frontend) — set in Project Settings → Environment Variables

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://shahbaz206-islamic-assistant-backend.hf.space/v1` |
| `NEXT_PUBLIC_WS_URL` | `https://shahbaz206-islamic-assistant-backend.hf.space` |

---

## Database — Supabase

| Field | Value |
|---|---|
| **Project name** | islamic-assistant |
| **Project ID** | jqrflmqacliezkwmxqiv |
| **Region** | Northeast Asia (Seoul) ap-northeast-2 |
| **Dashboard** | https://supabase.com/dashboard/project/jqrflmqacliezkwmxqiv |
| **Connection string (Transaction pooler)** | `postgresql://postgres.jqrflmqacliezkwmxqiv:[PASSWORD]@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres` |

> **Password**: Reset anytime in Supabase → Settings → Database → Reset database password.
> Never commit the real password to git.

### Database Tables

| Table | Description |
|---|---|
| `users` | User accounts (email/OAuth) |
| `user_locations` | User's lat/lng/timezone for prayer calculation |
| `oauth_identities` | Google/Apple OAuth links |
| `refresh_tokens` | JWT refresh token store |
| `devices` | Registered devices (mobile, web, speaker) |
| `prayer_times` | Cached computed prayer times per user per day |
| `azan_settings` | Per-user Azan preferences |
| `azan_voices` | Available Azan audio files |
| `quran_reciters` | Available Quran reciters |
| `quran_translations` | Available Quran translations |
| `quran_schedules` | User-created Quran playback schedules |
| `quran_bookmarks` | User's Quran bookmarks |
| `playback_events` | Audit log of every Azan/Quran trigger |
| `notifications` | In-app notification inbox |

### Reset Database (run schema from scratch)

Go to Supabase → SQL Editor → paste contents of `db/schema.sql` → Run.

---

## Local Development

### Prerequisites

- Node.js 20+
- Docker Desktop (for local Postgres + Redis)
- Git

### Setup

```bash
# Clone
git clone https://github.com/ShahbazAli206/Islamic_Smart_Assistant.git
cd Islamic_Smart_Assistant/islamic-smart-assistant

# Backend
cd backend
npm install
cp .env.example .env   # edit .env with your local values
docker compose up -d   # starts local Postgres + Redis
npm run start:dev

# Web dashboard (separate terminal)
cd ../web
npm install
# create .env.local:
echo "NEXT_PUBLIC_API_URL=http://localhost:4000/v1" > .env.local
echo "NEXT_PUBLIC_WS_URL=http://localhost:4000" >> .env.local
npm run dev
```

### Local .env (backend)

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/islamic_assistant
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-only-secret
PORT=4000
NODE_ENV=development
LOG_LEVEL=debug
```

### Useful Scripts

```bash
# Backend
npm run start:dev      # dev mode with hot reload
npm run build          # compile TypeScript
npm run lint           # ESLint fix

# Web
npm run dev            # Next.js dev server on :3000
npm run build          # production build
npm run lint           # ESLint
```

---

## HF Space — How to Update Backend Code

HF Space has its own git repo separate from GitHub. To push a backend update:

```bash
# Clone HF Space repo (one-time setup)
git clone https://huggingface.co/spaces/Shahbaz206/islamic-assistant-backend hf-space-backend
cd hf-space-backend

# Copy updated files from local project
cp -r ../Islamic_Smart_Assistant/islamic-smart-assistant/backend/src ./src

# Commit and push — triggers auto-rebuild on HF
git add .
git commit -m "update backend"
git push
# Username: Shahbaz206
# Password: HF Access Token (huggingface.co/settings/tokens)
```

Or edit files directly on the HF Space website: Files tab → navigate → pencil icon → commit.

---

## Architecture Summary

```
Browser / Mobile
      │
      ▼
Vercel (Next.js)  ──REST/WS──►  HF Space (NestJS :7860)
                                      │           │
                                  Redis        Supabase
                                 (BullMQ)    (PostgreSQL)
                                  :6379         :6543
```

- **Auth**: JWT (access 15min + refresh token)
- **Scheduling**: BullMQ delayed jobs fire at exact prayer times
- **Real-time**: Socket.io rooms per user — all devices in `user:{userId}` room
- **Prayer calculation**: `adhan` library (client-side accurate, no external API)
- **Notifications**: Firebase FCM (requires `FCM_SERVICE_ACCOUNT_JSON_PATH` env var)

---

## What Still Needs Real Assets

| Feature | Status | What's needed |
|---|---|---|
| Azan audio | Placeholder URLs | Real licensed MP3s on S3/R2 |
| Quran audio | Placeholder URLs | Real CDN with reciters |
| FCM push | Disabled (no-op) | Firebase service account JSON |
| Google OAuth | Scaffold only | Google Cloud OAuth credentials |
| Apple OAuth | Scaffold only | Apple Developer account + key |
| Alexa / Google Home | Not implemented | Amazon/Google developer accounts |

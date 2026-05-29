# Islamic Smart Assistant Ecosystem

A cross-platform Islamic lifestyle automation platform: prayer times, Azan playback, Quran recitation, smart scheduling, and multi-device sync across mobile, web, desktop, and smart speakers.

## Status: Scaffold (Foundation Layer)

This repository is a **production-shaped scaffold**, not a finished product. It contains:

- Working backend skeleton (NestJS) with all 8 services as separate modules
- React Native mobile app skeleton with navigation, i18n, theming, and screen wiring
- Next.js admin dashboard skeleton
- Electron desktop wrapper around the web build
- PostgreSQL schema with all tables defined
- Docker Compose for local dev (Postgres, Redis, backend)
- Kubernetes manifests for production
- WebSocket gateway for live device sync
- BullMQ queues for scheduled Azan/Quran triggers

What it does **not** yet contain (these are real engineering tasks, not just config):

- Verified, licensed Azan/Quran audio assets
- Alexa Skills Kit / Google Actions deployments (requires Amazon/Google developer accounts and certification)
- Real Apple/Google OAuth credentials
- Production AWS S3 / Cloudflare R2 buckets
- App Store / Play Store / Microsoft Store submission artifacts

Each integration point in the code is marked with a `TODO(integration):` comment explaining what credentials / SDK / asset is needed.

## Monorepo Layout

```
islamic-smart-assistant/
  backend/         NestJS API + WebSocket gateway + BullMQ workers
  mobile/          React Native (iOS + Android)
  web/             Next.js admin dashboard
  desktop/         Electron shell wrapping the web build
  db/              PostgreSQL schema + migrations
  deployment/      Docker, Kubernetes, CI/CD
  docs/            Architecture, API spec, diagrams
```

## Quick Start (Local Dev)

```bash
# 1. Copy environment variables
cp .env.example .env

# 2. Start infrastructure (Postgres + Redis)
docker compose up -d postgres redis

# 3. Run database migrations
cd backend && npm install && npm run migrate

# 4. Start backend
npm run start:dev

# 5. In a separate shell, start mobile
cd ../mobile && npm install && npm run android   # or npm run ios

# 6. In a separate shell, start web dashboard
cd ../web && npm install && npm run dev
```

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — system architecture, data flow, scaling strategy
- [API.md](./API.md) — REST endpoints + WebSocket events
- [docs/device-sync.md](./docs/device-sync.md) — how multi-device Azan playback stays in sync
- [docs/scheduling-engine.md](./docs/scheduling-engine.md) — how prayer-based + cron triggers fire
- [deployment/README.md](./deployment/README.md) — production deployment guide

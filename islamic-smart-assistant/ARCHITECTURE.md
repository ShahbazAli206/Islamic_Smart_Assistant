# Architecture

## High-Level Diagram

```
                       ┌────────────────────────────────────────┐
                       │            CLIENT LAYER                │
                       │                                        │
   ┌─────────────┐    │  Mobile (RN)  Web (Next)  Desktop (Electron)
   │ Smart Speaker│◄──┤  Alexa Skill  Google Action               │
   │   Devices    │   │                                        │
   └─────────────┘    └────┬───────────────────────────────────┘
                            │ HTTPS (REST)
                            │ WSS    (real-time sync)
                            ▼
   ┌──────────────────────────────────────────────────────────┐
   │                       API GATEWAY                         │
   │              (NestJS, behind Nginx / ALB)                 │
   │  ┌──────────────────────────────────────────────────────┐ │
   │  │  Auth │ Users │ PrayerTimes │ Azan │ Quran │         │ │
   │  │ Scheduling │ Devices │ Sync(WS) │ Notifications      │ │
   │  └──────────────────────────────────────────────────────┘ │
   └──────┬───────────────────┬─────────────────────────┬─────┘
          │                   │                         │
          ▼                   ▼                         ▼
   ┌─────────────┐    ┌──────────────┐         ┌──────────────┐
   │ PostgreSQL  │    │ Redis +      │         │ Object Store │
   │  (RDS / CSQ)│    │ BullMQ       │         │ S3 / R2      │
   │             │    │ (queues, ws  │         │ (audio assets)│
   │             │    │  pub/sub)    │         │              │
   └─────────────┘    └──────────────┘         └──────────────┘
                            │
                            ▼
                    ┌────────────────┐
                    │ Scheduler Worker│  (cron + prayer triggers)
                    │ Azan Worker     │  (fan-out to devices)
                    │ Quran Worker    │  (scheduled recitation)
                    │ Push Worker     │  (FCM / APNS)
                    └────────────────┘
```

## Why this shape

**NestJS modular monolith first, microservices when needed.** Each service is its own NestJS module with clear boundaries (its own controller, service, repository). When a module's load profile diverges (e.g. Azan fan-out hits 10x other traffic), it can be lifted into its own deployable without rewriting domain code.

**Redis BullMQ for time-critical fan-out.** Prayer times are calculated once per user per day and queued as delayed jobs (`runAt = prayerTime - leadIn`). When the job fires, the Azan worker publishes a `play.azan` event over Redis pub/sub; the WebSocket gateway forwards it to every connected device for that user; offline devices receive a push notification with pre-cached audio.

**Audio is never streamed at trigger time.** Devices pre-cache the user's selected Azan voice on settings change. The trigger only carries a `playbackId` and a target timestamp (NTP-aligned), so all devices start playback within ~100ms of each other.

**Prayer time calculation is pure.** The `PrayerTimeEngine` is a deterministic function of `(lat, lng, date, fiqh)`. No DB writes at request time — results are computed and cached in Redis with a 24h TTL, and pre-warmed by a daily cron at 00:01 user-local.

## Data Flow: Azan Trigger

1. User completes onboarding → backend computes today's + tomorrow's prayer times.
2. Scheduler enqueues 5 BullMQ delayed jobs (Fajr...Isha) at `prayerTime + delayMinutes`.
3. At firing time, Azan worker:
   - Loads user's `AzanSettings.selected_voice` + `sync_group`
   - Publishes `{ event: "azan.play", playAt: <NTP epoch ms>, audioUrl, playbackId }` to Redis pub/sub channel `user:{userId}`
4. WebSocket gateway, subscribed to that channel, pushes the message to every WS connection in the sync group.
5. Each client schedules `audioPlayer.play(audioUrl)` with `setTimeout(playAt - now)`.
6. Offline devices receive an FCM/APNS push containing the same payload; the OS wakes the app to play.

## Data Flow: Quran Schedule

Same as Azan but the worker pulls the `QuranSchedules` row to determine surah/ayah range and translation language.

## Smart Speaker Integration

- **Alexa**: A separate Alexa Skill (`alexa-skill/`) handles voice intents like "Alexa, ask Islamic Assistant for today's prayer times." The skill backend calls our REST API with the user's linked account token (Alexa account linking flow). For automatic Azan playback on Alexa, we use the Notifications API + Reminders API; users must opt in.
- **Google Home**: Google Actions handle conversational intents similarly. For autoplay we use Media Responses; ambient/background playback requires Google Action approval.
- **Bluetooth / WiFi speakers**: Played through the host device (phone/desktop) as the audio output, not as a separately addressed endpoint.

## Scaling Strategy

| Tier         | <10k users           | 10k–1M               | >1M                                       |
|--------------|----------------------|----------------------|-------------------------------------------|
| Backend      | Single NestJS pod    | 3–5 pods + HPA       | Split: API pods + Worker pods + WS pods   |
| Postgres     | RDS db.t3.medium     | db.m6.xlarge + read replicas | Citus / Aurora cluster, shard by user_id |
| Redis        | Single node          | Cluster (3 shards)   | Cluster (sharded) + separate pub/sub Redis |
| WS gateway   | In-process           | Sticky session LB    | Dedicated WS tier with Redis adapter      |
| Audio        | Single S3 bucket     | + CloudFront         | Multi-region buckets, edge cache          |

## Security

- JWT (RS256) access tokens, 15min TTL; refresh tokens, 30d TTL, stored hashed in DB.
- Device tokens linked to user; revocable from dashboard.
- All audio URLs are signed (S3 presigned, 1h TTL).
- Rate limiting: per-IP (Nginx) + per-user (NestJS throttler).
- PII at rest encrypted via column-level encryption for `location` and `email`.

## Non-Functional Targets

| Concern              | Target                                              |
|----------------------|-----------------------------------------------------|
| Azan trigger jitter  | < 200ms across all devices in a sync group          |
| API p95 latency      | < 150ms (prayer times cached), < 400ms (uncached)   |
| WS reconnect time    | < 2s with exponential backoff                       |
| Mobile battery       | Background scheduler uses OS-level alarms (WorkManager / BGTaskScheduler), no polling |
| Offline              | 7 days of prayer times + currently selected Azan audio cached locally |

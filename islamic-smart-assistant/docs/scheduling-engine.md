# Scheduling Engine

## Components

```
        ┌─────────────────────────┐
        │ HTTP edit (settings,    │
        │ location, schedule)     │
        └──────────┬──────────────┘
                   │
                   ▼
        ┌─────────────────────────┐
        │ SchedulingService       │
        │  - clearUserJobs()      │
        │  - rescheduleAllForUser │
        └──────────┬──────────────┘
                   │ delayed jobs
                   ▼
        ┌─────────────────────────┐
        │ BullMQ (Redis-backed)   │
        │  queues: azan, quran    │
        └──────────┬──────────────┘
                   │ fires at runAt
                   ▼
        ┌─────────────────────────┐
        │ AzanWorker / QuranWorker│
        │  → SyncGateway (WS)     │
        │  → NotificationsService │
        │  → playback_events log  │
        └─────────────────────────┘

   ┌─────────────────────────────────┐
   │ DailyRolloverCron @nestjs/sched │
   │  hourly: rescheduleAllForUser   │
   └─────────────────────────────────┘
```

## Why delayed jobs, not cron

A naive design schedules one cron per prayer per user — 5 × N entries. At a million users that's 5M cron rows, each fired through application code. Bull's delayed-job set is a single sorted set in Redis; firing is O(log n) and trivially fan-out-able across worker pods.

## Job IDs are deterministic

We use `azan:{userId}:{YYYY-MM-DD}:{prayer}` as the BullMQ jobId. That makes "user changes fiqh → re-enqueue" idempotent: if a job for the same key already exists, BullMQ rejects the duplicate. We side-step the rejection by clearing the user's existing delayed jobs first.

## When do we reschedule?

| Trigger                                    | Action                                               |
|--------------------------------------------|------------------------------------------------------|
| New user sets location                     | `rescheduleAllForUser(userId, 7)`                    |
| User changes fiqh                          | Same                                                 |
| User toggles a prayer in Azan settings     | Same                                                 |
| User adds/removes a Quran schedule         | Same                                                 |
| Hourly rollover cron                       | All users: enqueue next 48h if not already enqueued  |
| User selects a different Azan voice        | No reschedule needed — voice is looked up at fire time |
| User moves cities (location change)        | Same as new location                                 |

## DST and timezone changes

Prayer times are computed in the user's timezone (Luxon `setZone`). When DST switches, the local-noon→UTC mapping shifts by one hour and the next rollover picks up correct values. We never store local-time strings — everything is UTC `Date` objects with timezone metadata.

## Edge case: location changes mid-day

User flies from Karachi to Dubai. They open the app on landing and click "Detect location."

1. `POST /users/me/location` updates the row.
2. `UsersService.setLocation` calls `prayer.warmCache(userId, 7)` (overwrites cache) and `scheduling.rescheduleAllForUser` (clears old delayed jobs, enqueues new ones).
3. Tonight's Isha is now Dubai-time. The user's still-connected phone gets the new jobs immediately; their kitchen Echo at home keeps using its server-side schedule (which is shared across devices — only Azan output device changes if they place themselves in a different `sync_group`).

## Custom cron triggers for Quran

The scaffold only supports `prayer`-triggered Quran schedules and a stub for `cron`-triggered. Production should:

- Use `cron-parser` to enumerate the next N firings of a cron expression.
- Cap to e.g. 14 firings per schedule per enqueue cycle (otherwise a `* * * * *` cron would explode the queue).
- The hourly rollover top-up keeps the next 48h hot.

## Observability

- All worker invocations write to `playback_events`. The admin dashboard graphs fired-vs-played counts per day from this table.
- BullMQ exposes per-queue metrics (waiting/active/delayed/completed/failed); export to Prometheus via `bullmq-prometheus-exporter`.
- Alert if `delayed.count > expected * 2` (something's blocking workers) or if `failed.count > 1% of completed.count` over 1h.

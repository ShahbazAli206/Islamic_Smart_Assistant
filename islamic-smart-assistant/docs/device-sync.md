# Device Sync Architecture

## Goal

When Fajr arrives, every device a user owns — phone, tablet, desktop, web tab, smart speaker — should start playing Azan within ~100ms of each other, regardless of network latency. The same applies to scheduled Quran recitations.

## How

### 1. Trigger originates server-side

Mobile/desktop devices do **not** compete to fire Azan. The server is the source of truth: BullMQ holds delayed jobs keyed by `(userId, date, prayer)`. When a job fires, exactly one worker handles it.

### 2. Fan-out is push-based

The Azan worker publishes one event to Redis pub/sub on channel `user:{userId}`. The WebSocket gateway is subscribed to that channel via the `@socket.io/redis-adapter`, so every backend pod with a live WS connection for that user receives the event and forwards it to its sockets. Total fan-out cost: one Redis publish + N WebSocket sends, regardless of how many backend pods exist.

### 3. Synchronization via target timestamp

The event payload includes `playAt: <unix-ms ~2s in the future>`. Each client calls `setTimeout(playAt - now)` and starts playback exactly at that moment. The 2-second lead-in absorbs network jitter.

Clients are clock-synced to the server via a periodic `ping → pong` handshake:

```
client → ping { ts: clientNow }
server → pong { clientTs, serverTs }
```

The client maintains a rolling offset `serverOffset = serverTs - (clientTs + rtt/2)` and uses `now + serverOffset` when computing the timeout. Drift stays under ~10ms even on cellular networks.

### 4. Offline devices

A device that's not WS-connected at trigger time misses the event. Two fallbacks:

1. **Push notification** carrying the same payload. The OS wakes the app, which schedules playback with the (possibly already past) `playAt`. If `playAt` is in the past by less than 10s, play immediately; otherwise skip.
2. **Pre-scheduled OS alarms.** On mobile, the app registers a `notifee` timestamp trigger for every prayer time in the next 7 days. This is the primary mechanism for fully-killed apps — it works without the network and without our server.

### 5. Sync groups

A user can place devices into named groups (`home`, `office`, `mosque`). The Azan worker checks the sync group on the Azan settings row and only emits to devices in that group, so muting the bedroom phone while keeping the living-room desktop active is possible.

### 6. Smart speakers (Alexa / Google Home)

These devices aren't WebSocket clients — they live in Amazon's / Google's clouds. To trigger them, the Azan worker calls the platform's "proactive event" / "Media Response" API with the user's linked OAuth token:

- **Alexa**: Notifications API + Reminders API. User must consent during account linking.
- **Google Home**: Push Notifications via Actions API; supported endpoints are limited and subject to certification.

These calls are best-effort: if the platform throttles or rejects, the worker logs and moves on without retry.

## What can go wrong

| Failure                         | Mitigation                                                                 |
|---------------------------------|----------------------------------------------------------------------------|
| Backend pod crashes mid-fan-out | Idempotent job; BullMQ retries on the next worker. `playbackId` dedupes ack rows. |
| WebSocket disconnects           | Exponential reconnect, missed event covered by push notification.          |
| Client clock skew > 5s          | We don't trust client clocks — `playAt` is server-anchored and ping-corrected. |
| User on cellular with 3s RTT    | The 2s lead-in may not be enough — the audio plays late, but plays. Logged. |
| Audio not pre-cached            | Client falls back to streaming; first byte may add 0.5–2s. Pre-cache on settings change to avoid. |
| Audio licensing                 | All bundled Azan / Quran audio must come from sources with redistribution rights. Maintain `attributions.json` in the audio bucket and surface in app's About screen. |

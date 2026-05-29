# API Reference

Base URL: `https://api.islamicassistant.app/v1`
Auth: `Authorization: Bearer <jwt>` unless marked public.

## Authentication

### POST /auth/register  (public)
```json
{ "email": "user@example.com", "password": "...", "name": "Shahbaz" }
→ 201 { "accessToken": "...", "refreshToken": "...", "user": { ... } }
```

### POST /auth/login  (public)
```json
{ "email": "...", "password": "..." }
→ 200 { "accessToken": "...", "refreshToken": "...", "user": { ... } }
```

### POST /auth/refresh  (public)
```json
{ "refreshToken": "..." }
→ 200 { "accessToken": "...", "refreshToken": "..." }
```

### POST /auth/oauth/{provider}  (public)  — provider in {google, apple}
```json
{ "idToken": "..." }
→ 200 { "accessToken": "...", "refreshToken": "...", "user": { ... } }
```

## Users

### GET /users/me
Returns current user profile.

### PATCH /users/me
```json
{ "name": "...", "language": "ur", "sect": "sunni", "fiqh_method": "hanafi" }
```

### POST /users/me/location
```json
{ "lat": 24.86, "lng": 67.00, "timezone": "Asia/Karachi", "city": "Karachi", "country": "PK" }
→ 200  (triggers prayer time recomputation + schedule refresh)
```

## Prayer Times

### GET /prayer-times?date=YYYY-MM-DD
Returns today's (or given date's) prayer times for the authenticated user.
```json
{
  "date": "2026-05-28",
  "timezone": "Asia/Karachi",
  "fajr": "04:01", "sunrise": "05:30",
  "dhuhr": "12:25", "asr": "16:09",
  "maghrib": "19:13", "isha": "20:42"
}
```

### GET /prayer-times/range?from=YYYY-MM-DD&to=YYYY-MM-DD
Bulk fetch (max 31 days). Used by mobile for offline caching.

### GET /prayer-times/qibla
```json
{ "bearing": 261.4 }  // degrees from true north
```

## Azan

### GET /azan/voices
Lists available Azan audio packs.
```json
[
  { "id": "makkah", "name": "Makkah",   "audioUrl": "...", "size": 1.2 },
  { "id": "madinah", "name": "Madinah", "audioUrl": "...", "size": 1.4 },
  { "id": "pakistan", "name": "Pakistan Style", "audioUrl": "...", "size": 1.1 },
  { "id": "turkey",  "name": "Turkish", "audioUrl": "...", "size": 1.3 },
  { "id": "egypt",   "name": "Egyptian","audioUrl": "...", "size": 1.5 }
]
```

### GET /azan/settings
### PUT /azan/settings
```json
{ "selected_voice": "makkah", "delay_minutes": 0, "auto_play_enabled": true, "prayers": { "fajr": true, "dhuhr": true, "asr": true, "maghrib": true, "isha": true } }
```

## Quran

### GET /quran/surahs
List of 114 surahs with metadata.

### GET /quran/surah/{id}?translation=en
Returns ayahs with optional translation.

### GET /quran/audio/{reciterId}/{surahId}
Returns signed audio URL.

### GET /quran/schedules
### POST /quran/schedules
```json
{
  "surah": 36,
  "time_trigger": { "type": "prayer", "prayer": "fajr", "offset_minutes": 5 },
  "repeat_type": "daily",
  "translation_language": "ur"
}
```
Or:
```json
{
  "surah": 67,
  "time_trigger": { "type": "cron", "cron": "0 22 * * *" },
  "repeat_type": "daily"
}
```

### DELETE /quran/schedules/{id}

## Devices

### POST /devices  (called on app launch)
```json
{ "device_type": "mobile", "platform": "android", "push_token": "fcm-token", "name": "Pixel 8" }
→ 201 { "id": "...", "sync_group": "default" }
```

### GET /devices  — list user's registered devices
### PATCH /devices/{id}  — rename / move to sync group
### DELETE /devices/{id}  — unlink

### POST /devices/{id}/sync-group
```json
{ "group": "home" }  // or "office", "mosque", custom names
```

## Sync (WebSocket)

Connect: `wss://api.islamicassistant.app/v1/sync?token=<jwt>`

### Events server → client
| event              | payload                                                                |
|--------------------|------------------------------------------------------------------------|
| `azan.play`        | `{ playAt, audioUrl, playbackId, prayer, syncGroup }`                  |
| `quran.play`       | `{ playAt, audioUrl, surah, ayahFrom, ayahTo, translation, scheduleId}`|
| `settings.changed` | `{ section, value }`                                                   |
| `device.kicked`    | `{ reason }` — server-initiated disconnect                             |

### Events client → server
| event              | payload                                       |
|--------------------|-----------------------------------------------|
| `ping`             | `{ ts }` → server replies `pong` for clock sync |
| `playback.ack`     | `{ playbackId, status: "played"\|"failed", err? }` |
| `presence`         | `{ deviceId, batteryLevel?, network: "wifi"\|"cell" }` |

## Notifications

### POST /notifications/test  — sends a test push to all user devices

## Admin (dashboard only, requires admin role)

### GET /admin/users
### GET /admin/users/{id}
### POST /admin/azan-packs   (multipart upload)
### GET /admin/analytics/summary
### GET /admin/devices/online

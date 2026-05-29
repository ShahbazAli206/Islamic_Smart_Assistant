-- Islamic Smart Assistant — PostgreSQL Schema
-- All timestamps are TIMESTAMPTZ (UTC). Local time is derived from users.timezone.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "citext";     -- case-insensitive email

-- =============================================================
-- ENUMS
-- =============================================================
CREATE TYPE sect_t          AS ENUM ('sunni', 'shia');
CREATE TYPE fiqh_t          AS ENUM ('hanafi', 'shafi', 'maliki', 'hanbali', 'jafari');
CREATE TYPE device_type_t   AS ENUM ('mobile', 'tablet', 'web', 'desktop', 'speaker');
CREATE TYPE platform_t      AS ENUM ('android', 'ios', 'web', 'windows', 'macos', 'linux', 'alexa', 'google_home');
CREATE TYPE repeat_type_t   AS ENUM ('once', 'daily', 'weekly', 'custom');
CREATE TYPE prayer_t        AS ENUM ('fajr', 'dhuhr', 'asr', 'maghrib', 'isha');
CREATE TYPE trigger_kind_t  AS ENUM ('cron', 'prayer');

-- =============================================================
-- USERS
-- =============================================================
CREATE TABLE users (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email             CITEXT UNIQUE NOT NULL,
    password_hash     TEXT,                              -- nullable for OAuth-only users
    name              TEXT NOT NULL,
    avatar_url        TEXT,
    language          TEXT NOT NULL DEFAULT 'en',        -- ISO 639-1
    sect              sect_t,
    fiqh_method       fiqh_t,
    is_admin          BOOLEAN NOT NULL DEFAULT FALSE,
    is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at        TIMESTAMPTZ
);
CREATE INDEX users_email_idx ON users (email) WHERE deleted_at IS NULL;

CREATE TABLE user_locations (
    user_id     UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    lat         DOUBLE PRECISION NOT NULL,
    lng         DOUBLE PRECISION NOT NULL,
    timezone    TEXT NOT NULL,                           -- IANA, e.g. "Asia/Karachi"
    city        TEXT,
    country     TEXT,                                    -- ISO 3166-1 alpha-2
    detected_via TEXT,                                   -- 'gps' | 'ip' | 'manual'
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE oauth_identities (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider      TEXT NOT NULL,                         -- 'google' | 'apple'
    provider_uid  TEXT NOT NULL,
    UNIQUE (provider, provider_uid)
);

CREATE TABLE refresh_tokens (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    user_agent TEXT,
    ip         INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX refresh_tokens_user_idx ON refresh_tokens (user_id) WHERE revoked_at IS NULL;

-- =============================================================
-- DEVICES
-- =============================================================
CREATE TABLE devices (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_type   device_type_t NOT NULL,
    platform      platform_t NOT NULL,
    name          TEXT,                                  -- "Pixel 8", "Living Room Echo"
    push_token    TEXT,                                  -- FCM / APNS / Alexa endpoint
    sync_group    TEXT NOT NULL DEFAULT 'default',
    last_seen_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX devices_user_idx       ON devices (user_id);
CREATE INDEX devices_sync_group_idx ON devices (user_id, sync_group);

-- =============================================================
-- PRAYER TIMES (cached per-day per-user)
-- =============================================================
CREATE TABLE prayer_times (
    user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date      DATE NOT NULL,                             -- local date in user's TZ
    fajr      TIMESTAMPTZ NOT NULL,
    sunrise   TIMESTAMPTZ NOT NULL,
    dhuhr     TIMESTAMPTZ NOT NULL,
    asr       TIMESTAMPTZ NOT NULL,
    maghrib   TIMESTAMPTZ NOT NULL,
    isha      TIMESTAMPTZ NOT NULL,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, date)
);

-- =============================================================
-- AZAN SETTINGS
-- =============================================================
CREATE TABLE azan_settings (
    user_id           UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    selected_voice    TEXT NOT NULL DEFAULT 'makkah',    -- references azan_voices.id
    delay_minutes     INT  NOT NULL DEFAULT 0,
    auto_play_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    prayers_enabled   JSONB NOT NULL DEFAULT '{"fajr":true,"dhuhr":true,"asr":true,"maghrib":true,"isha":true}',
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE azan_voices (
    id          TEXT PRIMARY KEY,                        -- 'makkah', 'madinah', etc.
    name        TEXT NOT NULL,
    audio_url   TEXT NOT NULL,                           -- S3 / R2 URL
    size_bytes  BIGINT NOT NULL,
    duration_ms INT NOT NULL,
    is_default  BOOLEAN NOT NULL DEFAULT FALSE,
    is_custom   BOOLEAN NOT NULL DEFAULT FALSE,
    uploaded_by UUID REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- QURAN
-- =============================================================
CREATE TABLE quran_reciters (
    id           TEXT PRIMARY KEY,                       -- 'mishary', 'sudais', etc.
    name         TEXT NOT NULL,
    style        TEXT,                                   -- 'murattal' | 'mujawwad'
    audio_base_url TEXT NOT NULL                         -- + /{surah:03d}.mp3
);

CREATE TABLE quran_translations (
    id          TEXT PRIMARY KEY,                        -- 'en.sahih', 'ur.maududi'
    language    TEXT NOT NULL,                           -- ISO 639-1
    name        TEXT NOT NULL,
    author      TEXT
);

CREATE TABLE quran_schedules (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    surah                INT NOT NULL CHECK (surah BETWEEN 1 AND 114),
    ayah_from            INT,
    ayah_to              INT,
    reciter_id           TEXT REFERENCES quran_reciters(id),
    translation_language TEXT,
    -- trigger:
    trigger_kind         trigger_kind_t NOT NULL,
    trigger_prayer       prayer_t,                       -- when trigger_kind = 'prayer'
    trigger_offset_min   INT  DEFAULT 0,                 -- when trigger_kind = 'prayer'
    trigger_cron         TEXT,                           -- when trigger_kind = 'cron'
    repeat_type          repeat_type_t NOT NULL DEFAULT 'daily',
    enabled              BOOLEAN NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (
        (trigger_kind = 'prayer' AND trigger_prayer IS NOT NULL)
     OR (trigger_kind = 'cron'   AND trigger_cron   IS NOT NULL)
    )
);
CREATE INDEX quran_schedules_user_idx ON quran_schedules (user_id) WHERE enabled;

CREATE TABLE quran_bookmarks (
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    surah      INT NOT NULL,
    ayah       INT NOT NULL,
    note       TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, surah, ayah)
);

-- =============================================================
-- PLAYBACK / SYNC AUDIT
-- =============================================================
CREATE TABLE playback_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id   UUID REFERENCES devices(id) ON DELETE SET NULL,
    playback_id UUID NOT NULL,                           -- groups one logical trigger across devices
    kind        TEXT NOT NULL,                           -- 'azan' | 'quran'
    status      TEXT NOT NULL,                           -- 'queued'|'played'|'failed'|'skipped'
    error       TEXT,
    fired_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX playback_events_playback_idx ON playback_events (playback_id);
CREATE INDEX playback_events_user_time_idx ON playback_events (user_id, fired_at DESC);

-- =============================================================
-- NOTIFICATIONS (in-app inbox)
-- =============================================================
CREATE TABLE notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind       TEXT NOT NULL,
    title      TEXT NOT NULL,
    body       TEXT,
    data       JSONB,
    read_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX notifications_user_unread_idx ON notifications (user_id, created_at DESC) WHERE read_at IS NULL;

-- =============================================================
-- SEED DATA
-- =============================================================
INSERT INTO azan_voices (id, name, audio_url, size_bytes, duration_ms, is_default) VALUES
  ('makkah',   'Makkah Haram Azan',     'https://cdn.example.com/azan/makkah.mp3',   1200000, 180000, TRUE),
  ('madinah',  'Madinah Haram Azan',    'https://cdn.example.com/azan/madinah.mp3',  1400000, 195000, FALSE),
  ('pakistan', 'Pakistan Style',        'https://cdn.example.com/azan/pakistan.mp3', 1100000, 175000, FALSE),
  ('turkey',   'Turkish',               'https://cdn.example.com/azan/turkey.mp3',   1300000, 190000, FALSE),
  ('egypt',    'Egyptian',              'https://cdn.example.com/azan/egypt.mp3',    1500000, 200000, FALSE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO quran_reciters (id, name, style, audio_base_url) VALUES
  ('mishary',     'Mishary Rashid Alafasy', 'murattal',  'https://cdn.example.com/quran/mishary'),
  ('sudais',      'Abdul Rahman Al-Sudais', 'murattal',  'https://cdn.example.com/quran/sudais'),
  ('husary',      'Mahmoud Khalil Al-Husary','mujawwad', 'https://cdn.example.com/quran/husary')
ON CONFLICT (id) DO NOTHING;

INSERT INTO quran_translations (id, language, name, author) VALUES
  ('en.sahih',   'en', 'Sahih International', 'Saheeh International'),
  ('ur.maududi', 'ur', 'Tafhim ul-Quran',     'Abul Ala Maududi'),
  ('ar',         'ar', 'Arabic (Original)',   NULL)
ON CONFLICT (id) DO NOTHING;

-- Custom (user-uploaded) Azan audio.
-- Stores the uploaded clip's bytes inline in Postgres so a clip uploaded on one
-- platform (web/desktop/mobile) is persisted and served to all of them via
-- GET /v1/azan/voices/:id/audio. Run once against the live database:
--   psql "$DATABASE_URL" -f db/migrations/0001_azan_custom_audio.sql

ALTER TABLE azan_voices ADD COLUMN IF NOT EXISTS audio_data BYTEA;
ALTER TABLE azan_voices ADD COLUMN IF NOT EXISTS mime_type  TEXT;

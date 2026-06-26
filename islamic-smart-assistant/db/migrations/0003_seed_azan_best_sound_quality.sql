-- Adds "Azan — Best Sound Quality" as a built-in catalogued voice.
-- The audio is served directly from the web app's public/audio/ folder
-- (no audio_data stored in the DB); this row makes it show up in GET /azan/voices.
--
-- Run once against the live database:
--   psql "$DATABASE_URL" -f db/migrations/0003_seed_azan_best_sound_quality.sql

INSERT INTO azan_voices (id, name, audio_url, size_bytes, duration_ms, is_default, is_custom)
VALUES (
  'azan-best-sound-quality',
  'Azan — Best Sound Quality',
  '/audio/Azan Best Sound quality.mp3',
  2594943,
  166000,
  FALSE,
  FALSE
)
ON CONFLICT (id) DO NOTHING;

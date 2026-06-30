-- Remove Seyyid Taleh Boradigahi (Azerbaijani Azan) from the azan_voices table.
-- Run once against the live database:
--   psql "$DATABASE_URL" -f db/migrations/0004_delete_seyyid_taleh_boradigahi.sql

DELETE FROM azan_voices WHERE id = 'seyyid-taleh-boradigahi';

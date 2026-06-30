-- Curated reciter Azan voices bundled with the web app (web/public/audio/azan/*.m4a).
-- These are served to web + desktop directly from /public; this seed also records
-- them in the database so they're catalogued and reach the mobile app.
--
-- audio_url is RELATIVE so web + desktop (same origin) play them as-is. For the
-- native mobile app, prefix it with the deployed web origin, e.g.:
--   UPDATE azan_voices SET audio_url = 'https://<your-web-host>' || audio_url
--   WHERE audio_url LIKE '/audio/azan/%';
--
-- Run once against the live database:
--   psql "$DATABASE_URL" -f db/migrations/0002_seed_uploaded_azan_voices.sql

INSERT INTO azan_voices (id, name, audio_url, size_bytes, duration_ms, is_default, is_custom) VALUES
  ('hafiz-ahmed-raza-qadri',     'Hafiz Ahmed Raza Qadri',          '/audio/azan/hafiz-ahmed-raza-qadri.m4a',     2918774, 146000, FALSE, FALSE),
  ('abdul-rahman-mossad',        'Abdul Rahman Mossad',             '/audio/azan/abdul-rahman-mossad.m4a',        3374699, 169000, FALSE, FALSE),
  ('madinah-adhan',              'Azan Madinah',                    '/audio/azan/madinah-adhan.m4a',              3784201, 189000, FALSE, FALSE),
  ('egzon-ibrahimi',             'Egzon Ibrahimi',                  '/audio/azan/egzon-ibrahimi.m4a',             4470001, 224000, FALSE, FALSE),
  ('islam-sobhi',                'Islam Sobhi',                     '/audio/azan/islam-sobhi.m4a',                2764067, 138000, FALSE, FALSE),
  ('makkah-abdallah-ahmad',      'Makkah — Abdallah Ahmad',         '/audio/azan/makkah-abdallah-ahmad.m4a',      2975768, 149000, FALSE, FALSE),
  ('masjid-al-haram',            'Masjid Al-Haram',                 '/audio/azan/masjid-al-haram.m4a',            3310769, 166000, FALSE, FALSE),
  ('mevlan-kurtishi',            'Mevlan Kurtishi',                 '/audio/azan/mevlan-kurtishi.m4a',            3139475, 157000, FALSE, FALSE),
  ('masjid-nabawi-osama-akhdar', 'Masjid Nabawi — Osama Al-Akhdar', '/audio/azan/masjid-nabawi-osama-akhdar.m4a', 4191097, 210000, FALSE, FALSE)
ON CONFLICT (id) DO NOTHING;

// Minimal Kysely DB type shapes. Mirrors db/schema.sql.
// In production: generate this file from the live schema via `kysely-codegen`.

import type { ColumnType, Generated } from 'kysely';

// Columns with DB-generated defaults: readable always, optional on insert, not directly updated.
type Generated<T> = ColumnType<T, T | undefined, never>;
type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;
type AutoTimestamp = ColumnType<Date, Date | string | undefined, never>;

export interface UsersTable {
  id: Generated<string>;
  email: string;
  password_hash: string | null;
  name: string;
  avatar_url: string | null;
  language: string;
  sect: 'sunni' | 'shia' | null;
  fiqh_method: 'hanafi' | 'shafi' | 'maliki' | 'hanbali' | 'jafari' | null;
  is_admin: boolean;
  is_email_verified: boolean;
  created_at: AutoTimestamp;
  updated_at: Timestamp;
  deleted_at: Timestamp | null;
}

export interface UserLocationsTable {
  user_id: string;
  lat: number;
  lng: number;
  timezone: string;
  city: string | null;
  country: string | null;
  detected_via: string | null;
  updated_at: Timestamp;
}

export interface DevicesTable {
  id: Generated<string>;
  user_id: string;
  device_type: 'mobile' | 'tablet' | 'web' | 'desktop' | 'speaker';
  platform: 'android' | 'ios' | 'web' | 'windows' | 'macos' | 'linux' | 'alexa' | 'google_home';
  name: string | null;
  push_token: string | null;
  sync_group: string;
  last_seen_at: Timestamp | null;
  created_at: AutoTimestamp;
}

export interface PrayerTimesTable {
  user_id: string;
  date: string;             // YYYY-MM-DD (local)
  fajr: Timestamp;
  sunrise: Timestamp;
  dhuhr: Timestamp;
  asr: Timestamp;
  maghrib: Timestamp;
  isha: Timestamp;
  computed_at: Timestamp;
}

export interface AzanSettingsTable {
  user_id: string;
  selected_voice: string;
  delay_minutes: number;
  auto_play_enabled: boolean;
  prayers_enabled: Record<'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha', boolean>;
  updated_at: Timestamp;
}

export interface AzanVoicesTable {
  id: string;
  name: string;
  audio_url: string;
  size_bytes: number;
  duration_ms: number;
  is_default: boolean;
  is_custom: boolean;
  uploaded_by: string | null;
  // Inline bytes for custom uploads (built-ins keep these null and use audio_url).
  audio_data: ColumnType<Buffer | null, Buffer | null | undefined, Buffer | null | undefined>;
  mime_type: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  created_at: AutoTimestamp;
}

export interface QuranRecitersTable {
  id: string;
  name: string;
  audio_base_url: string;
  language: string | null;
  is_default: boolean;
  created_at: AutoTimestamp;
}

export interface QuranRecitersTable {
  id: string;                 // app-supplied, e.g. 'mishary'
  name: string;
  style: string | null;       // 'murattal' | 'mujawwad'
  audio_base_url: string;
}

export interface QuranSchedulesTable {
  id: Generated<string>;
  user_id: string;
  surah: number;
  ayah_from: number | null;
  ayah_to: number | null;
  reciter_id: string | null;
  translation_language: string | null;
  trigger_kind: 'cron' | 'prayer';
  trigger_prayer: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | null;
  trigger_offset_min: number | null;
  trigger_cron: string | null;
  repeat_type: 'once' | 'daily' | 'weekly' | 'custom';
  enabled: boolean;
  created_at: AutoTimestamp;
}

export interface RefreshTokensTable {
  id: Generated<string>;
  user_id: string;
  token_hash: string;
  expires_at: Timestamp;
  revoked_at: Timestamp | null;
  user_agent: string | null;
  ip: string | null;
  created_at: AutoTimestamp;
}

export interface NotificationsTable {
  id: Generated<string>;
  user_id: string;
  kind: string;
  title: string;
  body: string | null;
  data: any | null;
  read_at: Timestamp | null;
  created_at: AutoTimestamp;
}

export interface PlaybackEventsTable {
  id: Generated<string>;
  user_id: string;
  device_id: string | null;
  playback_id: string;
  kind: 'azan' | 'quran';
  status: 'queued' | 'played' | 'failed' | 'skipped';
  error: string | null;
  fired_at: Timestamp;
}

export interface DB {
  users: UsersTable;
  user_locations: UserLocationsTable;
  devices: DevicesTable;
  prayer_times: PrayerTimesTable;
  azan_settings: AzanSettingsTable;
  azan_voices: AzanVoicesTable;
  quran_reciters: QuranRecitersTable;
  quran_schedules: QuranSchedulesTable;
  refresh_tokens: RefreshTokensTable;
  notifications: NotificationsTable;
  playback_events: PlaybackEventsTable;
}

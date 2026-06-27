'use client';

/**
 * Community audio uploads — shared across ALL users/devices via Supabase.
 *
 * Setup (one-time, free Supabase project):
 *  1. Create a project at supabase.com
 *  2. In the SQL editor run the schema below
 *  3. Create a Storage bucket named "azan-audio" and set it to Public
 *  4. Add to web/.env.local:
 *       NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *       NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
 *  5. Rebuild the app
 *
 * SQL schema:
 *   CREATE TABLE community_uploads (
 *     id          text PRIMARY KEY,
 *     name        text NOT NULL,
 *     audio_type  text NOT NULL DEFAULT 'azan',
 *     public_url  text NOT NULL,
 *     duration_sec numeric NOT NULL DEFAULT 0,
 *     created_at  timestamptz DEFAULT now()
 *   );
 *   ALTER TABLE community_uploads ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "public read"   ON community_uploads FOR SELECT USING (true);
 *   CREATE POLICY "public insert" ON community_uploads FOR INSERT WITH CHECK (true);
 *   CREATE POLICY "public delete" ON community_uploads FOR DELETE USING (true);
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL      ?? '';
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const BUCKET = 'azan-audio';

let _client: SupabaseClient | null = null;
function getClient(): SupabaseClient | null {
  if (!URL || !ANON) return null;
  if (!_client) _client = createClient(URL, ANON);
  return _client;
}

export interface CommunityUpload {
  id: string;
  name: string;
  audio_type: 'azan' | 'durood' | 'dua';
  public_url: string;
  duration_sec: number;
  created_at: string;
}

/** Upload an audio blob to Supabase Storage and insert a metadata row.
 *  Returns the public URL on success, null if Supabase is not configured. */
export async function uploadCommunityAudio(
  blob: Blob,
  meta: { id: string; name: string; audioType: string; durationSec: number },
): Promise<string | null> {
  const sb = getClient();
  if (!sb) return null;

  const storagePath = `${meta.audioType}/${meta.id}.wav`;

  // 1. Upload file to Storage
  const { error: uploadErr } = await sb.storage
    .from(BUCKET)
    .upload(storagePath, blob, { contentType: 'audio/wav', upsert: false });
  if (uploadErr) throw new Error(`Storage upload failed: ${uploadErr.message}`);

  // 2. Get public URL
  const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(storagePath);
  const publicUrl = urlData.publicUrl;

  // 3. Insert metadata row
  const { error: dbErr } = await sb.from('community_uploads').insert({
    id: meta.id,
    name: meta.name,
    audio_type: meta.audioType,
    public_url: publicUrl,
    duration_sec: meta.durationSec,
  });
  if (dbErr) throw new Error(`DB insert failed: ${dbErr.message}`);

  return publicUrl;
}

/** Fetch all community uploads, optionally filtered by audio_type. */
export async function fetchCommunityUploads(
  audioType?: 'azan' | 'durood' | 'dua',
): Promise<CommunityUpload[]> {
  const sb = getClient();
  if (!sb) return [];

  let q = sb
    .from('community_uploads')
    .select('id, name, audio_type, public_url, duration_sec, created_at')
    .order('created_at', { ascending: false });
  if (audioType) q = q.eq('audio_type', audioType);

  const { data, error } = await q;
  if (error) return [];
  return (data ?? []) as CommunityUpload[];
}

/** Delete a community upload (storage file + DB row). */
export async function deleteCommunityUpload(id: string, audioType: string): Promise<void> {
  const sb = getClient();
  if (!sb) return;
  const storagePath = `${audioType}/${id}.wav`;
  await sb.storage.from(BUCKET).remove([storagePath]);
  await sb.from('community_uploads').delete().eq('id', id);
}

/** Whether Supabase credentials are configured. */
export function isCommunityEnabled(): boolean {
  return Boolean(URL && ANON);
}

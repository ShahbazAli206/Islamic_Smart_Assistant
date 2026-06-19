import { Inject, Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { randomUUID } from 'crypto';

import { DB_TOKEN } from '../../common/db.module';
import type { DB } from '../../common/db.types';
import { SchedulingService } from '../scheduling/scheduling.service';

@Injectable()
export class AzanService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Kysely<DB>,
    private readonly scheduling: SchedulingService,
  ) {}

  // Built-in + custom voices for every platform. The inline `audio_data` bytes
  // are deliberately NOT selected — only the small metadata + a playable URL.
  voices() {
    return this.db
      .selectFrom('azan_voices')
      .select(['id', 'name', 'audio_url', 'size_bytes', 'duration_ms', 'is_default', 'is_custom', 'uploaded_by'])
      .orderBy('is_custom', 'asc')
      .orderBy('created_at', 'asc')
      .execute();
  }

  /** Persist a user-uploaded custom Azan clip (bytes stored inline in Postgres
   *  so it's available to web, desktop and mobile via the public audio route). */
  async createCustomVoice(
    userId: string,
    input: { name?: string; durationMs: number; sizeBytes: number; mime: string; data: Buffer },
    baseUrl: string,
  ) {
    const id = `custom:${randomUUID()}`;
    const audioUrl = `${baseUrl.replace(/\/+$/, '')}/azan/voices/${encodeURIComponent(id)}/audio`;
    const name = (input.name?.trim() || 'Custom Azan').slice(0, 120);
    const durationMs = Math.max(0, Math.round(input.durationMs) || 0);
    await this.db
      .insertInto('azan_voices')
      .values({
        id,
        name,
        audio_url: audioUrl,
        size_bytes: input.sizeBytes,
        duration_ms: durationMs,
        is_default: false,
        is_custom: true,
        uploaded_by: userId,
        audio_data: input.data,
        mime_type: input.mime || 'audio/wav',
      })
      .execute();
    return { id, name, audio_url: audioUrl, size_bytes: input.sizeBytes, duration_ms: durationMs, is_default: false, is_custom: true, uploaded_by: userId };
  }

  /** Raw bytes for a stored custom clip — streamed by the public audio route. */
  async getAudio(id: string) {
    const row = await this.db
      .selectFrom('azan_voices')
      .select(['audio_data', 'mime_type'])
      .where('id', '=', id)
      .executeTakeFirst();
    if (!row || !row.audio_data) return null;
    return { data: row.audio_data as Buffer, mime: row.mime_type || 'audio/wav' };
  }

  /** Delete one of the user's own custom clips. */
  async deleteCustomVoice(userId: string, id: string) {
    await this.db
      .deleteFrom('azan_voices')
      .where('id', '=', id)
      .where('uploaded_by', '=', userId)
      .where('is_custom', '=', true)
      .execute();
    return { ok: true };
  }

  async getSettings(userId: string) {
    const existing = await this.db.selectFrom('azan_settings').selectAll().where('user_id', '=', userId).executeTakeFirst();
    if (existing) return existing;
    return this.db
      .insertInto('azan_settings')
      .values({
        user_id: userId,
        selected_voice: 'makkah',
        delay_minutes: 0,
        auto_play_enabled: true,
        prayers_enabled: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async updateSettings(userId: string, dto: Partial<{ selected_voice: string; delay_minutes: number; auto_play_enabled: boolean; prayers_enabled: any }>) {
    await this.db
      .insertInto('azan_settings')
      .values({
        user_id: userId,
        selected_voice: dto.selected_voice ?? 'makkah',
        delay_minutes: dto.delay_minutes ?? 0,
        auto_play_enabled: dto.auto_play_enabled ?? true,
        prayers_enabled: dto.prayers_enabled ?? { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
        updated_at: new Date(),
      })
      .onConflict((oc) => oc.column('user_id').doUpdateSet({ ...dto, updated_at: new Date() }))
      .execute();
    // Any setting change affecting timing requires re-enqueueing.
    await this.scheduling.rescheduleAllForUser(userId);
    return this.getSettings(userId);
  }
}

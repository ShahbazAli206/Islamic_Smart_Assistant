import { Inject, Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';

import { DB_TOKEN } from '../../common/db.module';
import type { DB } from '../../common/db.types';
import { SchedulingService } from '../scheduling/scheduling.service';

@Injectable()
export class AzanService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Kysely<DB>,
    private readonly scheduling: SchedulingService,
  ) {}

  voices() {
    return this.db.selectFrom('azan_voices').select(['id', 'name', 'audio_url', 'size_bytes', 'duration_ms', 'is_default']).execute();
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

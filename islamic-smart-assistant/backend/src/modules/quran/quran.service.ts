import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Kysely } from 'kysely';

import { DB_TOKEN } from '../../common/db.module';
import type { DB } from '../../common/db.types';
import { SchedulingService } from '../scheduling/scheduling.service';

// Surah metadata: 114 entries. In production, load from a JSON resource file.
const SURAHS = Array.from({ length: 114 }, (_, i) => ({ id: i + 1, name_ar: '', name_en: '', ayah_count: 0 }));

@Injectable()
export class QuranService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Kysely<DB>,
    private readonly scheduling: SchedulingService,
  ) {}

  surahs() { return SURAHS; }

  surah(id: number, _translation?: string) {
    // TODO(integration): load surah text + translation from a vetted source
    // (e.g. tanzil.net XML or quran.com API). Cache in Redis with a 30d TTL.
    if (id < 1 || id > 114) throw new NotFoundException();
    return { id, ayahs: [] as Array<{ number: number; arabic: string; translation?: string }> };
  }

  async audioUrl(reciterId: string, surahId: number) {
    const reciter = await this.db.selectFrom('quran_reciters').select(['audio_base_url']).where('id', '=', reciterId).executeTakeFirst();
    if (!reciter) throw new NotFoundException('Reciter not found');
    return { url: `${reciter.audio_base_url}/${String(surahId).padStart(3, '0')}.mp3` };
  }

  listSchedules(userId: string) {
    return this.db.selectFrom('quran_schedules').selectAll().where('user_id', '=', userId).execute();
  }

  async createSchedule(userId: string, dto: any) {
    const row = await this.db
      .insertInto('quran_schedules')
      .values({
        user_id: userId,
        surah: dto.surah,
        ayah_from: dto.ayah_from ?? null,
        ayah_to: dto.ayah_to ?? null,
        reciter_id: dto.reciter_id ?? 'mishary',
        translation_language: dto.translation_language ?? null,
        trigger_kind: dto.time_trigger.type,
        trigger_prayer: dto.time_trigger.prayer ?? null,
        trigger_offset_min: dto.time_trigger.offset_minutes ?? 0,
        trigger_cron: dto.time_trigger.cron ?? null,
        repeat_type: dto.repeat_type,
        enabled: true,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    await this.scheduling.rescheduleAllForUser(userId);
    return row;
  }

  async deleteSchedule(userId: string, id: string) {
    await this.db.deleteFrom('quran_schedules').where('id', '=', id).where('user_id', '=', userId).execute();
    await this.scheduling.rescheduleAllForUser(userId);
    return { ok: true };
  }
}

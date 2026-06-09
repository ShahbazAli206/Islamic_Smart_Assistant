import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Kysely } from 'kysely';

import { DB_TOKEN } from '../../../common/db.module';
import type { DB } from '../../../common/db.types';
import { QUEUE_QURAN } from '../scheduling.constants';
import { SyncGateway } from '../../sync/sync.gateway';
import { NotificationsService } from '../../notifications/notifications.service';
import type { QuranJob } from '../scheduling.service';

@Processor(QUEUE_QURAN)
export class QuranWorker extends WorkerHost {
  private readonly log = new Logger(QuranWorker.name);

  constructor(
    @Inject(DB_TOKEN) private readonly db: Kysely<DB>,
    private readonly sync: SyncGateway,
    private readonly notif: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<QuranJob>): Promise<void> {
    const { userId, scheduleId, playbackId } = job.data;
    const sched = await this.db
      .selectFrom('quran_schedules')
      .leftJoin('quran_reciters', 'quran_reciters.id', 'quran_schedules.reciter_id')
      .select(['quran_schedules.surah', 'quran_schedules.ayah_from', 'quran_schedules.ayah_to', 'quran_schedules.translation_language', 'quran_reciters.audio_base_url'])
      .where('quran_schedules.id', '=', scheduleId)
      .where('quran_schedules.enabled', '=', true)
      .executeTakeFirst();
    if (!sched) return;

    const playAt = Date.now() + 2000;
    const audioUrl = `${sched.audio_base_url ?? 'https://cdn.example.com/quran/mishary'}/${String(sched.surah).padStart(3, '0')}.mp3`;

    await this.sync.emitToUser(userId, 'quran.play', {
      playbackId,
      playAt,
      audioUrl,
      surah: sched.surah,
      ayahFrom: sched.ayah_from,
      ayahTo: sched.ayah_to,
      translation: sched.translation_language,
      scheduleId,
    });

    await this.notif.pushToUser(userId, {
      title: `Quran — Surah ${sched.surah}`,
      body: 'Scheduled recitation',
      data: { type: 'quran.play', playbackId, audioUrl, surah: String(sched.surah), playAt: String(playAt) },
    });

    await this.db
      .insertInto('playback_events')
      .values({ user_id: userId, playback_id: playbackId, kind: 'quran', status: 'queued', fired_at: new Date() })
      .execute();
  }
}

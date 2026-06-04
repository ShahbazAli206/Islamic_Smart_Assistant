import { Inject, Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { Kysely } from 'kysely';

import { DB_TOKEN } from '../../../common/db.module';
import type { DB } from '../../../common/db.types';
import { QUEUE_QURAN } from '../queue.constants';
import { SyncGateway } from '../../sync/sync.gateway';
import { NotificationsService } from '../../notifications/notifications.service';
import type { QuranJob } from '../scheduling.service';

@Injectable()
export class QuranWorker implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(QuranWorker.name);
  private worker!: Worker<QuranJob>;

  constructor(
    @Inject(DB_TOKEN) private readonly db: Kysely<DB>,
    private readonly sync: SyncGateway,
    private readonly notif: NotificationsService,
  ) {}

  onModuleInit() {
    const connection = { url: process.env.REDIS_URL ?? 'redis://localhost:6379' };
    this.worker = new Worker<QuranJob>(
      QUEUE_QURAN,
      async (job) => this.process(job),
      { connection },
    );
    this.worker.on('failed', (job, err) => {
      this.log.error(`Quran job ${job?.id} failed: ${err.message}`);
    });
    this.log.log('QuranWorker started');
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  private async process(job: Job<QuranJob>): Promise<void> {
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

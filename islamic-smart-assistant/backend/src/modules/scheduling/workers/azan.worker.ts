import { Inject, Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { Kysely } from 'kysely';

import { DB_TOKEN } from '../../../common/db.module';
import type { DB } from '../../../common/db.types';
import { QUEUE_AZAN } from '../queue.constants';
import { SyncGateway } from '../../sync/sync.gateway';
import { NotificationsService } from '../../notifications/notifications.service';
import type { AzanJob } from '../scheduling.service';

@Injectable()
export class AzanWorker implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(AzanWorker.name);
  private worker!: Worker<AzanJob>;

  constructor(
    @Inject(DB_TOKEN) private readonly db: Kysely<DB>,
    private readonly sync: SyncGateway,
    private readonly notif: NotificationsService,
  ) {}

  onModuleInit() {
    const connection = { url: process.env.REDIS_URL ?? 'redis://localhost:6379' };
    this.worker = new Worker<AzanJob>(
      QUEUE_AZAN,
      async (job) => this.process(job),
      { connection },
    );
    this.worker.on('failed', (job, err) => {
      this.log.error(`Azan job ${job?.id} failed: ${err.message}`);
    });
    this.log.log('AzanWorker started');
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  private async process(job: Job<AzanJob>): Promise<void> {
    const { userId, prayer, playbackId } = job.data;

    const settings = await this.db.selectFrom('azan_settings').select(['selected_voice']).where('user_id', '=', userId).executeTakeFirst();
    const voice = await this.db.selectFrom('azan_voices').select(['audio_url']).where('id', '=', settings?.selected_voice ?? 'makkah').executeTakeFirst();
    if (!voice) throw new Error(`Azan voice not found for user ${userId}`);

    // Play targets ~2s in the future so all devices have time to receive and schedule.
    const playAt = Date.now() + 2000;

    // 1. Broadcast over WebSocket to connected devices.
    await this.sync.emitToUser(userId, 'azan.play', { playbackId, playAt, audioUrl: voice.audio_url, prayer });

    // 2. Push notification to all devices (covers offline + foreground reinforcement).
    await this.notif.pushToUser(userId, {
      title: `${prayer.charAt(0).toUpperCase() + prayer.slice(1)} Azan`,
      body: 'Time for prayer',
      data: { type: 'azan.play', playbackId, audioUrl: voice.audio_url, prayer, playAt: String(playAt) },
    });

    // 3. Audit log.
    await this.db
      .insertInto('playback_events')
      .values({ user_id: userId, playback_id: playbackId, kind: 'azan', status: 'queued', fired_at: new Date() })
      .execute();
  }
}

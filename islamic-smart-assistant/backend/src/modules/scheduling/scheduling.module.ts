import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { SchedulingService } from './scheduling.service';
import { AzanWorker } from './workers/azan.worker';
import { QuranWorker } from './workers/quran.worker';
import { DailyRolloverCron } from './daily-rollover.cron';
import { SyncModule } from '../sync/sync.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrayerTimesModule } from '../prayer-times/prayer-times.module';

export const QUEUE_AZAN = 'azan';
export const QUEUE_QURAN = 'quran';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_AZAN }, { name: QUEUE_QURAN }),
    forwardRef(() => PrayerTimesModule),
    SyncModule,
    NotificationsModule,
  ],
  providers: [SchedulingService, AzanWorker, QuranWorker, DailyRolloverCron],
  exports: [SchedulingService, BullModule],
})
export class SchedulingModule {}

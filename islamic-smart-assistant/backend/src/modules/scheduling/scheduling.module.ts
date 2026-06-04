import { Module } from '@nestjs/common';

import { SchedulingService } from './scheduling.service';
import { DailyRolloverCron } from './daily-rollover.cron';
import { PrayerTimesModule } from '../prayer-times/prayer-times.module';

export const QUEUE_AZAN = 'azan';
export const QUEUE_QURAN = 'quran';

// BullModule.registerQueue is intentionally NOT used here.
// SchedulingService creates Queue instances directly via bullmq to avoid
// the @nestjs/bullmq@10 factory-provider circular dependency in @nestjs/core@10.3.
// Consumers (AzanWorker, QuranWorker) use @Processor + WorkerHost and are
// wired by BullExplorer from BullModule.forRoot() in AppModule.
@Module({
  imports: [PrayerTimesModule],
  providers: [SchedulingService, DailyRolloverCron],
  exports: [SchedulingService],
})
export class SchedulingModule {}

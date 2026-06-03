import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { SchedulingService } from './scheduling.service';
import { DailyRolloverCron } from './daily-rollover.cron';
import { PrayerTimesModule } from '../prayer-times/prayer-times.module';

export const QUEUE_AZAN = 'azan';
export const QUEUE_QURAN = 'quran';

// Producer module: registers queues + enqueues jobs.
// Consumers (AzanWorker, QuranWorker) live in WorkersModule to avoid
// NestJS BullMQ circular factory dep between @InjectQueue and @Processor.
@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_AZAN }, { name: QUEUE_QURAN }),
    PrayerTimesModule,
  ],
  providers: [SchedulingService, DailyRolloverCron],
  exports: [SchedulingService],
})
export class SchedulingModule {}

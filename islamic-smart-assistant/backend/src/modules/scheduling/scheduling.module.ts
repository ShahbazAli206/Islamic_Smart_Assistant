import { Module } from '@nestjs/common';

import { SchedulingService } from './scheduling.service';
import { DailyRolloverCron } from './daily-rollover.cron';
import { PrayerTimesModule } from '../prayer-times/prayer-times.module';
import { QUEUE_AZAN, QUEUE_QURAN } from './scheduling.constants';

export { QUEUE_AZAN, QUEUE_QURAN } from './scheduling.constants';

@Module({
  imports: [PrayerTimesModule],
  providers: [SchedulingService, DailyRolloverCron],
  exports: [SchedulingService],
})
export class SchedulingModule {}

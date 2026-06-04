import { Module } from '@nestjs/common';

import { SchedulingService } from './scheduling.service';
import { DailyRolloverCron } from './daily-rollover.cron';
import { PrayerTimesModule } from '../prayer-times/prayer-times.module';

@Module({
  imports: [PrayerTimesModule],
  providers: [SchedulingService, DailyRolloverCron],
  exports: [SchedulingService],
})
export class SchedulingModule {}

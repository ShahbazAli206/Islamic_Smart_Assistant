import { Module } from '@nestjs/common';
import { PrayerTimesController } from './prayer-times.controller';
import { PrayerTimesService } from './prayer-times.service';
import { PrayerTimeEngine } from './prayer-time.engine';

@Module({
  controllers: [PrayerTimesController],
  providers: [PrayerTimesService, PrayerTimeEngine],
  exports: [PrayerTimesService, PrayerTimeEngine],
})
export class PrayerTimesModule {}

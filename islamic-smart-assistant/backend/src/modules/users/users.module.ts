import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrayerTimesModule } from '../prayer-times/prayer-times.module';
import { SchedulingModule } from '../scheduling/scheduling.module';

@Module({
  imports: [PrayerTimesModule, SchedulingModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { LoggerModule } from 'nestjs-pino';

import { DbModule } from './common/db.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PrayerTimesModule } from './modules/prayer-times/prayer-times.module';
import { AzanModule } from './modules/azan/azan.module';
import { QuranModule } from './modules/quran/quran.module';
import { SchedulingModule } from './modules/scheduling/scheduling.module';
import { WorkersModule } from './modules/scheduling/workers/workers.module';
import { DevicesModule } from './modules/devices/devices.module';
import { SyncModule } from './modules/sync/sync.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      connection: { url: process.env.REDIS_URL ?? 'redis://localhost:6379' },
    }),
    DbModule,
    AuthModule,
    UsersModule,
    PrayerTimesModule,
    AzanModule,
    QuranModule,
    SchedulingModule,
    WorkersModule,
    DevicesModule,
    SyncModule,
    NotificationsModule,
  ],
})
export class AppModule {}

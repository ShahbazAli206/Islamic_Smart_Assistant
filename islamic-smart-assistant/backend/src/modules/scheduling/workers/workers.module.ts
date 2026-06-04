import { Module } from '@nestjs/common';

import { AzanWorker } from './azan.worker';
import { QuranWorker } from './quran.worker';
import { SyncModule } from '../../sync/sync.module';
import { NotificationsModule } from '../../notifications/notifications.module';

// Workers create BullMQ Worker instances manually in onModuleInit,
// connecting directly to Redis via REDIS_URL. No @nestjs/bullmq needed.
@Module({
  imports: [SyncModule, NotificationsModule],
  providers: [AzanWorker, QuranWorker],
})
export class WorkersModule {}

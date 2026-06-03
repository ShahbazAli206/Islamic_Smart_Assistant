import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { AzanWorker } from './azan.worker';
import { QuranWorker } from './quran.worker';
import { QUEUE_AZAN, QUEUE_QURAN } from '../scheduling.module';
import { SyncModule } from '../../sync/sync.module';
import { NotificationsModule } from '../../notifications/notifications.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_AZAN }, { name: QUEUE_QURAN }),
    SyncModule,
    NotificationsModule,
  ],
  providers: [AzanWorker, QuranWorker],
})
export class WorkersModule {}

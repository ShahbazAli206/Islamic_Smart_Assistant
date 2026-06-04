import { Module } from '@nestjs/common';

import { AzanWorker } from './azan.worker';
import { QuranWorker } from './quran.worker';
import { SyncModule } from '../../sync/sync.module';
import { NotificationsModule } from '../../notifications/notifications.module';

// Workers use @Processor + WorkerHost — they do NOT use @InjectQueue,
// so BullModule.registerQueue is NOT needed here.
// The BullExplorer (registered globally via BullModule.forRoot in AppModule)
// picks up @Processor classes and wires them using the global Redis connection.
// Registering the same queues in both SchedulingModule AND here caused the
// "circular dependency between factory providers" error.
@Module({
  imports: [SyncModule, NotificationsModule],
  providers: [AzanWorker, QuranWorker],
})
export class WorkersModule {}

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { SyncGateway } from './sync.gateway';

@Module({
  imports: [JwtModule.register({})],
  providers: [SyncGateway],
  exports: [SyncGateway],
})
export class SyncModule {}

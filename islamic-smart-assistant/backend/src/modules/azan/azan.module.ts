import { Module } from '@nestjs/common';
import { AzanController } from './azan.controller';
import { AzanPublicController } from './azan-public.controller';
import { AzanService } from './azan.service';
import { SchedulingModule } from '../scheduling/scheduling.module';

@Module({
  imports: [SchedulingModule],
  controllers: [AzanController, AzanPublicController],
  providers: [AzanService],
})
export class AzanModule {}

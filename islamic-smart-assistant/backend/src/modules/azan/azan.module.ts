import { Module } from '@nestjs/common';
import { AzanController } from './azan.controller';
import { AzanService } from './azan.service';
import { SchedulingModule } from '../scheduling/scheduling.module';

@Module({
  imports: [SchedulingModule],
  controllers: [AzanController],
  providers: [AzanService],
})
export class AzanModule {}

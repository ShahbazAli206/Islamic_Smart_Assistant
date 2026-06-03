import { Module } from '@nestjs/common';
import { AzanController } from './azan.controller';
import { AzanService } from './azan.service';

@Module({
  controllers: [AzanController],
  providers: [AzanService],
})
export class AzanModule {}

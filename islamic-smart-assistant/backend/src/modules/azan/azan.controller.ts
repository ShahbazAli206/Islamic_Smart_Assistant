import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { AzanService } from './azan.service';

class UpdateAzanSettingsDto {
  @IsOptional() @IsString() selected_voice?: string;
  @IsOptional() @IsInt() @Min(0) @Max(60) delay_minutes?: number;
  @IsOptional() @IsBoolean() auto_play_enabled?: boolean;
  @IsOptional() prayers_enabled?: { fajr: boolean; dhuhr: boolean; asr: boolean; maghrib: boolean; isha: boolean };
}

@ApiTags('azan')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('azan')
export class AzanController {
  constructor(private readonly svc: AzanService) {}

  @Get('voices')
  voices() {
    return this.svc.voices();
  }

  @Get('settings')
  get(@CurrentUser() user: AuthUser) {
    return this.svc.getSettings(user.id);
  }

  @Put('settings')
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateAzanSettingsDto) {
    return this.svc.updateSettings(user.id, dto);
  }
}

import { Body, Controller, Delete, Get, Param, ParseIntPipe, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBooleanString, IsIn, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { QuranService } from './quran.service';

class TriggerDto {
  @IsIn(['prayer', 'cron']) type!: 'prayer' | 'cron';
  @IsOptional() @IsIn(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']) prayer?: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
  @IsOptional() @IsInt() @Min(-60) @Max(120) offset_minutes?: number;
  @IsOptional() @IsString() cron?: string;
}

class CreateScheduleDto {
  @IsInt() @Min(1) @Max(114) surah!: number;
  @IsOptional() @IsInt() @Min(1) ayah_from?: number;
  @IsOptional() @IsInt() @Min(1) ayah_to?: number;
  @IsOptional() @IsString() reciter_id?: string;
  @IsOptional() @IsString() translation_language?: string;
  @ValidateNested() @Type(() => TriggerDto) time_trigger!: TriggerDto;
  @IsIn(['once', 'daily', 'weekly', 'custom']) repeat_type!: 'once' | 'daily' | 'weekly' | 'custom';
}

@ApiTags('quran')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quran')
export class QuranController {
  constructor(private readonly svc: QuranService) {}

  @Get('surahs')
  surahs() { return this.svc.surahs(); }

  @Get('surah/:id')
  surah(@Param('id', ParseIntPipe) id: number, @Query('translation') translation?: string) {
    return this.svc.surah(id, translation);
  }

  @Get('audio/:reciterId/:surahId')
  audio(@Param('reciterId') reciterId: string, @Param('surahId', ParseIntPipe) surahId: number) {
    return this.svc.audioUrl(reciterId, surahId);
  }

  @Get('schedules')
  list(@CurrentUser() user: AuthUser) { return this.svc.listSchedules(user.id); }

  @Post('schedules')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateScheduleDto) {
    return this.svc.createSchedule(user.id, dto);
  }

  @Delete('schedules/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.deleteSchedule(user.id, id);
  }
}

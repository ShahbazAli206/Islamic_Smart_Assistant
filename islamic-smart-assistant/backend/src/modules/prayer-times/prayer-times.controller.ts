import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsInt, IsISO8601, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { DateTime } from 'luxon';

import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PrayerTimesService } from './prayer-times.service';

class RangeDto {
  @IsISO8601() from!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(31) days!: number;
}

class DateDto {
  @IsOptional() @IsISO8601() date?: string;
}

@ApiTags('prayer-times')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('prayer-times')
export class PrayerTimesController {
  constructor(private readonly svc: PrayerTimesService) {}

  @Get()
  today(@CurrentUser() user: AuthUser, @Query() q: DateDto) {
    const date = q.date ?? DateTime.now().toFormat('yyyy-LL-dd');
    return this.svc.forDate(user.id, date);
  }

  @Get('range')
  range(@CurrentUser() user: AuthUser, @Query() q: RangeDto) {
    return this.svc.forRange(user.id, q.from, q.days);
  }

  @Get('qibla')
  qibla(@CurrentUser() user: AuthUser) {
    return this.svc.qibla(user.id);
  }
}

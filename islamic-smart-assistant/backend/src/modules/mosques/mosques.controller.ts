import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsLatitude, IsLongitude, IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

import { MosquesService } from './mosques.service';

class NearbyDto {
  @Type(() => Number) @IsLatitude() lat!: number;
  @Type(() => Number) @IsLongitude() lng!: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(250) @Max(50000) radius?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}

// Public endpoint — returns only public OpenStreetMap POI data, no user info.
@ApiTags('mosques')
@Controller('mosques')
export class MosquesController {
  constructor(private readonly svc: MosquesService) {}

  @Get('nearby')
  @ApiOperation({ summary: 'Find Muslim places of worship near a coordinate (OpenStreetMap).' })
  nearby(@Query() q: NearbyDto) {
    return this.svc.nearby(q.lat, q.lng, q.radius ?? 5000, q.limit ?? 60);
  }
}

import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsLatitude, IsLongitude, IsOptional, IsString } from 'class-validator';

import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';

class UpdateUserDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsIn(['sunni', 'shia']) sect?: 'sunni' | 'shia';
  @IsOptional() @IsIn(['hanafi', 'shafi', 'maliki', 'hanbali', 'jafari']) fiqh_method?: string;
}

class LocationDto {
  @IsLatitude() lat!: number;
  @IsLongitude() lng!: number;
  @IsString() timezone!: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsIn(['gps', 'ip', 'manual']) detected_via?: 'gps' | 'ip' | 'manual';
}

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.users.profile(user.id);
  }

  @Patch('me')
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateUserDto) {
    return this.users.update(user.id, dto);
  }

  @Post('me/location')
  setLocation(@CurrentUser() user: AuthUser, @Body() dto: LocationDto) {
    return this.users.setLocation(user.id, dto);
  }
}

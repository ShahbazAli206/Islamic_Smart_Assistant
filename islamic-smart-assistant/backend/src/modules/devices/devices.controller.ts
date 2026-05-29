import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { DevicesService } from './devices.service';

class RegisterDeviceDto {
  @IsIn(['mobile', 'tablet', 'web', 'desktop', 'speaker']) device_type!: 'mobile' | 'tablet' | 'web' | 'desktop' | 'speaker';
  @IsIn(['android', 'ios', 'web', 'windows', 'macos', 'linux', 'alexa', 'google_home']) platform!: any;
  @IsOptional() @IsString() push_token?: string;
  @IsOptional() @IsString() name?: string;
}

class UpdateDeviceDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() sync_group?: string;
}

@ApiTags('devices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('devices')
export class DevicesController {
  constructor(private readonly svc: DevicesService) {}

  @Post()
  register(@CurrentUser() user: AuthUser, @Body() dto: RegisterDeviceDto) {
    return this.svc.register(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) { return this.svc.list(user.id); }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDeviceDto) {
    return this.svc.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.remove(user.id, id);
  }
}

import {
  BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Req,
  UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { AzanService } from './azan.service';

// Minimal shape of a multer file — avoids needing @types/multer.
interface UploadedAudio { buffer: Buffer; size: number; mimetype: string; originalname: string; }

const MAX_AZAN_BYTES = 6 * 1024 * 1024; // 6 MB

class UpdateAzanSettingsDto {
  @IsOptional() @IsString() selected_voice?: string;
  @IsOptional() @IsInt() @Min(0) @Max(60) delay_minutes?: number;
  @IsOptional() @IsBoolean() auto_play_enabled?: boolean;
  @IsOptional() prayers_enabled?: { fajr: boolean; dhuhr: boolean; asr: boolean; maghrib: boolean; isha: boolean };
}

class UploadVoiceDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() duration_ms?: string;
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

  // Upload a custom Azan clip. Persisted to the DB and immediately listed by
  // GET /voices for every platform; playable at GET /voices/:id/audio.
  @Post('voices')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_AZAN_BYTES } }))
  uploadVoice(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: UploadedAudio | undefined,
    @Body() dto: UploadVoiceDto,
    @Req() req: any,
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('No audio file uploaded.');
    if (!file.mimetype?.startsWith('audio/')) throw new BadRequestException('File must be an audio clip.');
    if (file.size > MAX_AZAN_BYTES) throw new BadRequestException('Audio file is too large (max 6 MB).');
    // Build an absolute, publicly-fetchable URL for the audio route. Prefer an
    // explicit PUBLIC_API_URL (set behind the HF/Spaces proxy); else derive it.
    const proto = (req.headers?.['x-forwarded-proto'] as string) || req.protocol || 'https';
    const host = req.get?.('host');
    const base = process.env.PUBLIC_API_URL || `${proto}://${host}/v1`;
    return this.svc.createCustomVoice(
      user.id,
      { name: dto.name, durationMs: Number(dto.duration_ms) || 0, sizeBytes: file.size, mime: file.mimetype, data: file.buffer },
      base,
    );
  }

  // Delete one of the current user's own custom clips.
  @Delete('voices/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.deleteCustomVoice(user.id, id);
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

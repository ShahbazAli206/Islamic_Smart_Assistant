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
@Controller('azan')
export class AzanController {
  constructor(private readonly svc: AzanService) {}

  // Public — no auth required. All visitors see the same voice list (built-in +
  // every community upload). Audio bytes are served by the separate public route.
  @Get('voices')
  voices() {
    return this.svc.voices();
  }

  // Public upload — no account needed so web/desktop users without a login flow
  // can still share custom Azans with everyone. uploaded_by is null for anonymous
  // submissions; if a valid JWT is present, the user's id is stored instead.
  @Post('voices')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_AZAN_BYTES } }))
  uploadVoice(
    @UploadedFile() file: UploadedAudio | undefined,
    @Body() dto: UploadVoiceDto,
    @Req() req: any,
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('No audio file uploaded.');
    if (!file.mimetype?.startsWith('audio/')) throw new BadRequestException('File must be an audio clip.');
    if (file.size > MAX_AZAN_BYTES) throw new BadRequestException('Audio file is too large (max 6 MB).');
    const proto = (req.headers?.['x-forwarded-proto'] as string) || req.protocol || 'https';
    const host = req.get?.('host');
    const base = process.env.PUBLIC_API_URL || `${proto}://${host}/v1`;
    // req.user is populated by JwtAuthGuard when a valid token is present; null otherwise.
    const userId: string | null = (req.user as AuthUser | null)?.id ?? null;
    return this.svc.createCustomVoice(
      userId,
      { name: dto.name, durationMs: Number(dto.duration_ms) || 0, sizeBytes: file.size, mime: file.mimetype, data: file.buffer },
      base,
    );
  }

  // Auth-required: only the uploader can delete their own clip.
  @Delete('voices/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.deleteCustomVoice(user.id, id);
  }

  @Get('settings')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  get(@CurrentUser() user: AuthUser) {
    return this.svc.getSettings(user.id);
  }

  @Put('settings')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateAzanSettingsDto) {
    return this.svc.updateSettings(user.id, dto);
  }
}

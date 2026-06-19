import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AzanService } from './azan.service';

/**
 * Public (unauthenticated) route that streams a stored custom Azan clip's bytes.
 * Kept separate from the guarded AzanController so audio elements / native
 * players — which can't attach a bearer token — can fetch it directly. This is
 * what makes a web-uploaded clip playable on desktop and mobile.
 */
@ApiTags('azan')
@Controller('azan')
export class AzanPublicController {
  constructor(private readonly svc: AzanService) {}

  @Get('voices/:id/audio')
  async audio(@Param('id') id: string, @Res() res: any) {
    const clip = await this.svc.getAudio(id);
    if (!clip) throw new NotFoundException('Audio not found.');
    res.setHeader('Content-Type', clip.mime);
    res.setHeader('Content-Length', String(clip.data.length));
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Accept-Ranges', 'none');
    res.send(clip.data);
  }
}

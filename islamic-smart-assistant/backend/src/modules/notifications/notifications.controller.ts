import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notif: NotificationsService) {}

  @Post('test')
  async test(@CurrentUser() user: AuthUser) {
    await this.notif.pushToUser(user.id, { title: 'Test notification', body: 'If you can read this, push is working.', data: { type: 'test' } });
    return { ok: true };
  }
}

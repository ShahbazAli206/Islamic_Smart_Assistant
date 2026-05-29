import { Inject, Injectable, Logger } from '@nestjs/common';
import { Kysely } from 'kysely';
import * as admin from 'firebase-admin';

import { DB_TOKEN } from '../../common/db.module';
import type { DB } from '../../common/db.types';

interface PushPayload {
  title: string;
  body?: string;
  data?: Record<string, string>;
}

@Injectable()
export class NotificationsService {
  private readonly log = new Logger(NotificationsService.name);
  private fcm?: admin.app.App;

  constructor(@Inject(DB_TOKEN) private readonly db: Kysely<DB>) {
    const credPath = process.env.FCM_SERVICE_ACCOUNT_JSON_PATH;
    if (credPath) {
      this.fcm = admin.initializeApp({ credential: admin.credential.cert(require(credPath)) }, 'fcm');
    } else {
      this.log.warn('FCM_SERVICE_ACCOUNT_JSON_PATH not set — push notifications will be no-ops');
    }
    // TODO(integration): APNS — initialize node-apn here once APNS_KEY_PATH is set,
    // and route push_tokens with platform = 'ios' to APNS instead of FCM.
  }

  async pushToUser(userId: string, payload: PushPayload) {
    const devices = await this.db
      .selectFrom('devices')
      .select(['id', 'platform', 'push_token'])
      .where('user_id', '=', userId)
      .where('push_token', 'is not', null)
      .execute();
    if (!devices.length) return;

    // In-app inbox row.
    await this.db
      .insertInto('notifications')
      .values({ user_id: userId, kind: payload.data?.type ?? 'generic', title: payload.title, body: payload.body ?? null, data: payload.data ?? null })
      .execute();

    if (!this.fcm) return;
    const tokens = devices.filter((d) => d.platform !== 'alexa' && d.platform !== 'google_home').map((d) => d.push_token!) as string[];
    if (!tokens.length) return;
    try {
      await this.fcm.messaging().sendEachForMulticast({
        tokens,
        notification: { title: payload.title, body: payload.body },
        data: payload.data,
        android: { priority: 'high' },
        apns: { headers: { 'apns-priority': '10' }, payload: { aps: { sound: 'default' } } },
      });
    } catch (err) {
      this.log.error('FCM send failed', err as Error);
    }
  }
}

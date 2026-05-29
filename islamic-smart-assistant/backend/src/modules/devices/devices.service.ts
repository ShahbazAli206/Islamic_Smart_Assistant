import { Inject, Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';

import { DB_TOKEN } from '../../common/db.module';
import type { DB } from '../../common/db.types';

@Injectable()
export class DevicesService {
  constructor(@Inject(DB_TOKEN) private readonly db: Kysely<DB>) {}

  register(userId: string, dto: { device_type: any; platform: any; push_token?: string; name?: string }) {
    return this.db
      .insertInto('devices')
      .values({
        user_id: userId,
        device_type: dto.device_type,
        platform: dto.platform,
        push_token: dto.push_token ?? null,
        name: dto.name ?? null,
        sync_group: 'default',
        last_seen_at: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  list(userId: string) {
    return this.db.selectFrom('devices').selectAll().where('user_id', '=', userId).orderBy('created_at desc').execute();
  }

  async update(userId: string, id: string, dto: { name?: string; sync_group?: string }) {
    if (Object.keys(dto).length === 0) return { ok: true };
    await this.db.updateTable('devices').set(dto).where('id', '=', id).where('user_id', '=', userId).execute();
    return { ok: true };
  }

  async remove(userId: string, id: string) {
    await this.db.deleteFrom('devices').where('id', '=', id).where('user_id', '=', userId).execute();
    return { ok: true };
  }
}

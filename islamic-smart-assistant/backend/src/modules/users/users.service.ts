import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Kysely } from 'kysely';

import { DB_TOKEN } from '../../common/db.module';
import type { DB } from '../../common/db.types';
import { PrayerTimesService } from '../prayer-times/prayer-times.service';
import { SchedulingService } from '../scheduling/scheduling.service';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Kysely<DB>,
    private readonly prayer: PrayerTimesService,
    private readonly scheduling: SchedulingService,
  ) {}

  async profile(userId: string) {
    const user = await this.db
      .selectFrom('users')
      .select(['id', 'email', 'name', 'language', 'sect', 'fiqh_method', 'is_admin', 'avatar_url'])
      .where('id', '=', userId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
    if (!user) throw new NotFoundException();
    const location = await this.db.selectFrom('user_locations').selectAll().where('user_id', '=', userId).executeTakeFirst();
    return { ...user, location: location ?? null };
  }

  async update(userId: string, dto: Partial<{ name: string; language: string; sect: 'sunni' | 'shia'; fiqh_method: any }>) {
    if (Object.keys(dto).length === 0) return this.profile(userId);
    await this.db.updateTable('users').set({ ...dto, updated_at: new Date() }).where('id', '=', userId).execute();
    // Fiqh change affects prayer time calculation → invalidate cache and reschedule.
    if (dto.fiqh_method) {
      await this.prayer.invalidateCache(userId);
      await this.scheduling.rescheduleAllForUser(userId);
    }
    return this.profile(userId);
  }

  async setLocation(userId: string, loc: { lat: number; lng: number; timezone: string; city?: string; country?: string; detected_via?: string }) {
    await this.db
      .insertInto('user_locations')
      .values({ user_id: userId, ...loc, updated_at: new Date() })
      .onConflict((oc) =>
        oc.column('user_id').doUpdateSet({
          lat: loc.lat,
          lng: loc.lng,
          timezone: loc.timezone,
          city: loc.city ?? null,
          country: loc.country ?? null,
          detected_via: loc.detected_via ?? null,
          updated_at: new Date(),
        }),
      )
      .execute();

    // Recompute prayer times + reschedule queue jobs for the next 7 days.
    await this.prayer.warmCache(userId, 7);
    await this.scheduling.rescheduleAllForUser(userId);
    return { ok: true };
  }
}

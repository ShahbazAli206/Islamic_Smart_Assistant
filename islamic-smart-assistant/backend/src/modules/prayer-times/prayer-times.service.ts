import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Kysely } from 'kysely';
import { DateTime } from 'luxon';

import { DB_TOKEN } from '../../common/db.module';
import type { DB } from '../../common/db.types';
import { PrayerTimeEngine, FiqhMethod, PrayerSet } from './prayer-time.engine';

@Injectable()
export class PrayerTimesService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Kysely<DB>,
    private readonly engine: PrayerTimeEngine,
  ) {}

  async forDate(userId: string, date: string): Promise<PrayerSet & { timezone: string }> {
    const ctx = await this.userContext(userId);
    const dt = DateTime.fromISO(date, { zone: ctx.timezone });
    const cached = await this.db.selectFrom('prayer_times').selectAll().where('user_id', '=', userId).where('date', '=', date).executeTakeFirst();
    if (cached) {
      return {
        date: cached.date,
        timezone: ctx.timezone,
        fajr: new Date(cached.fajr as any),
        sunrise: new Date(cached.sunrise as any),
        dhuhr: new Date(cached.dhuhr as any),
        asr: new Date(cached.asr as any),
        maghrib: new Date(cached.maghrib as any),
        isha: new Date(cached.isha as any),
      };
    }
    const computed = this.engine.computeDay(ctx.lat, ctx.lng, ctx.timezone, dt, ctx.fiqh);
    await this.persist(userId, computed);
    return { ...computed, timezone: ctx.timezone };
  }

  async forRange(userId: string, fromISO: string, days: number): Promise<PrayerSet[]> {
    const ctx = await this.userContext(userId);
    return this.engine.computeRange(ctx.lat, ctx.lng, ctx.timezone, fromISO, days, ctx.fiqh);
  }

  async qibla(userId: string): Promise<{ bearing: number }> {
    const ctx = await this.userContext(userId);
    return { bearing: this.engine.qiblaBearing(ctx.lat, ctx.lng) };
  }

  async warmCache(userId: string, days: number) {
    const ctx = await this.userContext(userId);
    const today = DateTime.now().setZone(ctx.timezone).toFormat('yyyy-LL-dd');
    const sets = this.engine.computeRange(ctx.lat, ctx.lng, ctx.timezone, today, days, ctx.fiqh);
    await this.db.transaction().execute(async (trx) => {
      await trx.deleteFrom('prayer_times').where('user_id', '=', userId).where('date', '>=', today).execute();
      for (const s of sets) {
        await trx
          .insertInto('prayer_times')
          .values({
            user_id: userId,
            date: s.date,
            fajr: s.fajr,
            sunrise: s.sunrise,
            dhuhr: s.dhuhr,
            asr: s.asr,
            maghrib: s.maghrib,
            isha: s.isha,
            computed_at: new Date(),
          })
          .execute();
      }
    });
    return sets;
  }

  async invalidateCache(userId: string) {
    const today = DateTime.now().toFormat('yyyy-LL-dd');
    await this.db.deleteFrom('prayer_times').where('user_id', '=', userId).where('date', '>=', today).execute();
  }

  private async userContext(userId: string): Promise<{ lat: number; lng: number; timezone: string; fiqh: FiqhMethod | null }> {
    const row = await this.db
      .selectFrom('users')
      .leftJoin('user_locations', 'user_locations.user_id', 'users.id')
      .select(['users.fiqh_method as fiqh', 'user_locations.lat', 'user_locations.lng', 'user_locations.timezone'])
      .where('users.id', '=', userId)
      .executeTakeFirst();
    if (!row?.lat || !row.lng || !row.timezone) {
      throw new NotFoundException('Set your location first via POST /users/me/location');
    }
    return { lat: row.lat, lng: row.lng, timezone: row.timezone, fiqh: (row.fiqh as FiqhMethod | null) ?? null };
  }

  private async persist(userId: string, s: PrayerSet) {
    await this.db
      .insertInto('prayer_times')
      .values({
        user_id: userId,
        date: s.date,
        fajr: s.fajr,
        sunrise: s.sunrise,
        dhuhr: s.dhuhr,
        asr: s.asr,
        maghrib: s.maghrib,
        isha: s.isha,
        computed_at: new Date(),
      })
      .onConflict((oc) => oc.columns(['user_id', 'date']).doNothing())
      .execute();
  }
}

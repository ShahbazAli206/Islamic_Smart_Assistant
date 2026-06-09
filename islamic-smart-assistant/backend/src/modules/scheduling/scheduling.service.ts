import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Kysely } from 'kysely';
import { DateTime } from 'luxon';
import { randomUUID } from 'crypto';

import { DB_TOKEN } from '../../common/db.module';
import type { DB } from '../../common/db.types';
import { QUEUE_AZAN, QUEUE_QURAN } from './scheduling.constants';
import { PrayerTimesService } from '../prayer-times/prayer-times.service';

export interface AzanJob {
  userId: string;
  prayer: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
  playbackId: string;
  scheduledFor: string; // ISO
}

export interface QuranJob {
  userId: string;
  scheduleId: string;
  playbackId: string;
  scheduledFor: string;
}

@Injectable()
export class SchedulingService {
  private readonly log = new Logger(SchedulingService.name);

  constructor(
    @Inject(DB_TOKEN) private readonly db: Kysely<DB>,
    @InjectQueue(QUEUE_AZAN) private readonly azanQ: Queue<AzanJob>,
    @InjectQueue(QUEUE_QURAN) private readonly quranQ: Queue<QuranJob>,
    private readonly prayer: PrayerTimesService,
  ) {}

  /** Recompute prayer times + (re)enqueue all Azan and Quran jobs for the next N days. */
  async rescheduleAllForUser(userId: string, days = 2): Promise<void> {
    await this.clearUserJobs(userId);

    const sets = await this.prayer.warmCache(userId, days);
    const settings = await this.db.selectFrom('azan_settings').selectAll().where('user_id', '=', userId).executeTakeFirst();
    const enabledPrayers = settings?.prayers_enabled ?? { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true };
    const delay = settings?.delay_minutes ?? 0;
    const azanOn = settings?.auto_play_enabled ?? true;

    const now = Date.now();

    if (azanOn) {
      for (const day of sets) {
        for (const p of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const) {
          if (!enabledPrayers[p]) continue;
          const fireAt = new Date(day[p].getTime() + delay * 60_000);
          if (fireAt.getTime() <= now) continue;
          await this.azanQ.add(
            `${userId}:${day.date}:${p}`,
            { userId, prayer: p, playbackId: randomUUID(), scheduledFor: fireAt.toISOString() },
            { delay: fireAt.getTime() - now, jobId: `azan:${userId}:${day.date}:${p}`, removeOnComplete: 500, removeOnFail: 100 },
          );
        }
      }
    }

    await this.scheduleQuranForUser(userId, sets);
  }

  private async scheduleQuranForUser(userId: string, prayerSets: Awaited<ReturnType<PrayerTimesService['forRange']>>): Promise<void> {
    const schedules = await this.db.selectFrom('quran_schedules').selectAll().where('user_id', '=', userId).where('enabled', '=', true).execute();
    const now = Date.now();

    for (const s of schedules) {
      const fireTimes: Date[] = [];

      if (s.trigger_kind === 'prayer' && s.trigger_prayer) {
        for (const day of prayerSets) {
          const base = day[s.trigger_prayer];
          fireTimes.push(new Date(base.getTime() + (s.trigger_offset_min ?? 0) * 60_000));
        }
      } else if (s.trigger_kind === 'cron' && s.trigger_cron) {
        // Add the next 7 daily firings of the cron expression.
        // For brevity, this scaffold only supports "HH:MM" daily — replace with `cron-parser` for full cron.
        const [hh, mm] = (s.trigger_cron.match(/^\d+\s+\d+/)?.[0].split(/\s+/) ?? ['0', '0']).map(Number);
        for (let i = 0; i < prayerSets.length; i++) {
          const local = DateTime.fromJSDate(prayerSets[i].fajr).set({ hour: mm, minute: hh, second: 0 });
          fireTimes.push(local.toJSDate());
        }
      }

      for (const t of fireTimes) {
        if (t.getTime() <= now) continue;
        await this.quranQ.add(
          `${userId}:${s.id}:${t.toISOString()}`,
          { userId, scheduleId: s.id, playbackId: randomUUID(), scheduledFor: t.toISOString() },
          { delay: t.getTime() - now, jobId: `quran:${userId}:${s.id}:${t.toISOString()}`, removeOnComplete: 500, removeOnFail: 100 },
        );
      }
    }
  }

  private async clearUserJobs(userId: string) {
    // BullMQ has no native "remove all with prefix" — iterate the delayed set and drop matching jobs.
    for (const q of [this.azanQ, this.quranQ]) {
      const delayed = await q.getDelayed();
      for (const job of delayed) {
        if (job.id?.includes(`:${userId}:`)) await job.remove();
      }
    }
  }
}

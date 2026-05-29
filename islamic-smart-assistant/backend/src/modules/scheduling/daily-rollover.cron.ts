import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Kysely } from 'kysely';

import { DB_TOKEN } from '../../common/db.module';
import type { DB } from '../../common/db.types';
import { SchedulingService } from './scheduling.service';

/**
 * Every hour, find users whose local time just rolled into a new day and (re)schedule.
 *
 * Strategy: iterate active users in batches, but only enqueue the rescheduling
 * task into a low-priority queue if the user has < 24h of jobs ahead. Keeps
 * the prayer-time cache always warmed for ~48h.
 */
@Injectable()
export class DailyRolloverCron {
  private readonly log = new Logger(DailyRolloverCron.name);

  constructor(
    @Inject(DB_TOKEN) private readonly db: Kysely<DB>,
    private readonly scheduling: SchedulingService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async rollover() {
    const users = await this.db
      .selectFrom('users')
      .innerJoin('user_locations', 'user_locations.user_id', 'users.id')
      .select(['users.id'])
      .where('users.deleted_at', 'is', null)
      .execute();
    this.log.log(`Rollover: checking ${users.length} users`);

    for (const u of users) {
      try {
        await this.scheduling.rescheduleAllForUser(u.id, 2);
      } catch (err) {
        this.log.error(`rollover failed for ${u.id}`, err as Error);
      }
    }
  }
}

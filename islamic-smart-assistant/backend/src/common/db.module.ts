import { Global, Module } from '@nestjs/common';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

import type { DB } from './db.types';

export const DB_TOKEN = 'KYSELY_DB';

@Global()
@Module({
  providers: [
    {
      provide: DB_TOKEN,
      useFactory: () =>
        new Kysely<DB>({
          dialect: new PostgresDialect({
            pool: new Pool({
              connectionString: process.env.DATABASE_URL,
              max: Number(process.env.DB_POOL_MAX ?? 20),
            }),
          }),
        }),
    },
  ],
  exports: [DB_TOKEN],
})
export class DbModule {}

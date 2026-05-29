import { ConflictException, Inject, Injectable, NotImplementedException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { Kysely } from 'kysely';

import { DB_TOKEN } from '../../common/db.module';
import type { DB } from '../../common/db.types';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; name: string; language: string };
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Kysely<DB>,
    private readonly jwt: JwtService,
  ) {}

  async register(input: { email: string; password: string; name: string; language?: string }): Promise<TokenPair> {
    const existing = await this.db.selectFrom('users').select('id').where('email', '=', input.email).executeTakeFirst();
    if (existing) throw new ConflictException('Email already in use');

    const password_hash = await bcrypt.hash(input.password, 12);
    const row = await this.db
      .insertInto('users')
      .values({
        email: input.email,
        password_hash,
        name: input.name,
        language: input.language ?? 'en',
        is_admin: false,
        is_email_verified: false,
      })
      .returning(['id', 'email', 'name', 'language', 'is_admin'])
      .executeTakeFirstOrThrow();

    return this.issueTokens(row);
  }

  async login(email: string, password: string): Promise<TokenPair | null> {
    const user = await this.db
      .selectFrom('users')
      .select(['id', 'email', 'name', 'language', 'is_admin', 'password_hash'])
      .where('email', '=', email)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
    if (!user || !user.password_hash) return null;
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return null;
    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const row = await this.db
      .selectFrom('refresh_tokens')
      .innerJoin('users', 'users.id', 'refresh_tokens.user_id')
      .select(['users.id', 'users.email', 'users.name', 'users.language', 'users.is_admin', 'refresh_tokens.id as rt_id'])
      .where('refresh_tokens.token_hash', '=', tokenHash)
      .where('refresh_tokens.revoked_at', 'is', null)
      .where('refresh_tokens.expires_at', '>', new Date())
      .executeTakeFirst();
    if (!row) throw new UnauthorizedException('Invalid refresh token');

    // Rotate: revoke the old token, issue a new pair.
    await this.db.updateTable('refresh_tokens').set({ revoked_at: new Date() }).where('id', '=', row.rt_id).execute();
    return this.issueTokens(row);
  }

  async oauth(provider: 'google' | 'apple', _idToken: string): Promise<TokenPair> {
    // TODO(integration): verify idToken with provider's JWKS endpoint
    // - Google: https://oauth2.googleapis.com/tokeninfo?id_token=...
    // - Apple:  validate signature against https://appleid.apple.com/auth/keys
    // Then upsert into users + oauth_identities and call issueTokens.
    throw new NotImplementedException(`OAuth provider "${provider}" not yet wired up — see TODO in auth.service.ts`);
  }

  private async issueTokens(user: { id: string; email: string; name: string; language: string; is_admin?: boolean }): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email, is_admin: user.is_admin ?? false });
    const refreshToken = randomBytes(48).toString('base64url');
    const token_hash = createHash('sha256').update(refreshToken).digest('hex');
    const expires_at = new Date(Date.now() + 30 * 24 * 3600 * 1000); // 30d
    await this.db.insertInto('refresh_tokens').values({ user_id: user.id, token_hash, expires_at }).execute();
    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, language: user.language },
    };
  }
}

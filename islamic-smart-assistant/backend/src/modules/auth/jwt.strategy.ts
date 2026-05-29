import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { readFileSync } from 'fs';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const publicKey = process.env.JWT_PUBLIC_KEY_PATH
      ? readFileSync(process.env.JWT_PUBLIC_KEY_PATH, 'utf8')
      : 'dev-only-secret';
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: publicKey,
      algorithms: [process.env.JWT_PUBLIC_KEY_PATH ? 'RS256' : 'HS256'],
    });
  }

  validate(payload: { sub: string; email: string; is_admin: boolean }) {
    return { id: payload.sub, email: payload.email, is_admin: payload.is_admin };
  }
}

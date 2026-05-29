import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { readFileSync } from 'fs';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        privateKey: process.env.JWT_PRIVATE_KEY_PATH
          ? readFileSync(process.env.JWT_PRIVATE_KEY_PATH, 'utf8')
          : 'dev-only-secret',
        publicKey: process.env.JWT_PUBLIC_KEY_PATH
          ? readFileSync(process.env.JWT_PUBLIC_KEY_PATH, 'utf8')
          : 'dev-only-secret',
        signOptions: {
          algorithm: process.env.JWT_PRIVATE_KEY_PATH ? 'RS256' : 'HS256',
          expiresIn: process.env.JWT_ACCESS_TTL ?? '15m',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}

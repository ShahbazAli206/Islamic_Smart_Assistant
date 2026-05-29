import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

import { AuthService } from './auth.service';

class RegisterDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() language?: string;
}

class LoginDto {
  @IsEmail() email!: string;
  @IsString() password!: string;
}

class RefreshDto {
  @IsString() refreshToken!: string;
}

class OAuthDto {
  @IsString() idToken!: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const result = await this.auth.login(dto.email, dto.password);
    if (!result) throw new UnauthorizedException('Invalid credentials');
    return result;
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('oauth/google')
  oauthGoogle(@Body() dto: OAuthDto) {
    return this.auth.oauth('google', dto.idToken);
  }

  @Post('oauth/apple')
  oauthApple(@Body() dto: OAuthDto) {
    return this.auth.oauth('apple', dto.idToken);
  }
}

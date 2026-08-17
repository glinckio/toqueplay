import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../../common/redis/redis.service';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  jti?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  async validate(payload: JwtPayload) {
    // JWT blacklist: if jti is revoked (post-logout), reject even before natural expiry.
    if (payload.jti) {
      const revoked = await this.redisService.get(`revoked:jwt:${payload.jti}`);
      if (revoked) {
        throw new UnauthorizedException('Token revoked');
      }
    }
    return { id: payload.sub, email: payload.email, role: payload.role, jti: payload.jti };
  }
}

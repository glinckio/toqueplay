import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TwoFactorService } from './two-factor.service';
import { TwoFactorController } from './two-factor.controller';
import { MailModule } from '../mail/mail.module';
import { RedisModule } from '../../common/redis/redis.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    MailModule,
    RedisModule,
  ],
  controllers: [AuthController, TwoFactorController],
  providers: [AuthService, JwtStrategy, TwoFactorService],
  exports: [AuthService, TwoFactorService],
})
export class AuthModule {}

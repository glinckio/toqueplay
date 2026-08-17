import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma.service';
import { MailService } from '../mail/mail.service';
import { RedisService } from '../../common/redis/redis.service';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendCodeDto } from './dto/resend-code.dto';
import { TwoFactorService } from './two-factor.service';
import { OAuth2Client } from 'google-auth-library';
import { AppError } from '../../common/errors/app-error';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
    private redisService: RedisService,
    private twoFactorService: TwoFactorService,
  ) {
    this.googleClient = new OAuth2Client(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
    );
  }

  async register(
    dto: RegisterDto,
    ctx?: { ip?: string | null; userAgent?: string | null },
  ) {
    // LGPD art. 8 — registration requires explicit consent to Terms/Privacy.
    if (dto.consent !== true) {
      throw AppError.consentRequired();
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw AppError.emailAlreadyExists();
    }

    if (dto.password !== dto.confirmPassword) {
      throw AppError.passwordsDoNotMatch();
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        cpf: dto.cpf,
        password: hashedPassword,
        isFirstAccess: true,
        isEmailVerified: false,
        notificationPreferences: {
          messages: true,
          invites: true,
          matches: true,
          friendlies: true,
          tournaments: true,
        },
      },
    });

    // Persist all consents at the current Terms version.
    await this.persistConsents(user.id, dto.consents, ctx);

    const plainCode = await this.createVerificationCode(user.id);
    await this.mailService.sendVerificationEmail(
      user.email,
      plainCode,
      user.name,
    );

    return { message: 'Registro realizado. Verifique seu email.' };
  }

  private async persistConsents(
    userId: string,
    granular: RegisterDto['consents'],
    ctx?: { ip?: string | null; userAgent?: string | null },
  ) {
    const version = this.configService.get<string>('TERMS_VERSION') ?? 'v1';
    const base = {
      userId,
      version,
      ipAddress: ctx?.ip ?? null,
      userAgent: ctx?.userAgent ?? null,
    };

    const records: Array<{
      userId: string;
      version: string;
      purpose: any;
      accepted: boolean;
      ipAddress: string | null;
      userAgent: string | null;
    }> = [
      { ...base, purpose: 'TERMS', accepted: true },
    ];

    if (granular?.notificationsPush !== undefined) {
      records.push({
        ...base,
        purpose: 'NOTIFICATIONS_PUSH',
        accepted: granular.notificationsPush,
      });
    }
    if (granular?.locationDiscovery !== undefined) {
      records.push({
        ...base,
        purpose: 'LOCATION_DISCOVERY',
        accepted: granular.locationDiscovery,
      });
    }
    if (granular?.marketingEmail !== undefined) {
      records.push({
        ...base,
        purpose: 'MARKETING_EMAIL',
        accepted: granular.marketingEmail,
      });
    }

    await this.prisma.userConsent.createMany({ data: records });
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw AppError.userNotFound();
    }
    if (user.isEmailVerified) {
      throw AppError.emailAlreadyVerified();
    }

    const verification = await this.prisma.emailVerification.findFirst({
      where: {
        userId: user.id,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) {
      throw AppError.invalidOrExpiredCode();
    }

    const isValid = await bcrypt.compare(dto.code, verification.code);
    if (!isValid) {
      throw AppError.invalidOrExpiredCode();
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true },
    });

    await this.prisma.emailVerification.deleteMany({
      where: { userId: user.id },
    });

    const { accessToken, refreshToken } = await this.generateTokens(
      user.id,
      user.email,
      user.role,
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        isFirstAccess: user.isFirstAccess,
        isEmailVerified: true,
        role: user.role,
      },
    };
  }

  async resendCode(dto: ResendCodeDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw AppError.userNotFound();
    }
    if (user.isEmailVerified) {
      throw AppError.emailAlreadyVerified();
    }

    const latestCode = await this.prisma.emailVerification.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    if (latestCode) {
      const cooldown = new Date(latestCode.createdAt.getTime() + 60_000);
      if (new Date() < cooldown) {
        throw AppError.codeResendCooldown();
      }
    }

    await this.prisma.emailVerification.deleteMany({
      where: { userId: user.id },
    });

    const plainCode = await this.createVerificationCode(user.id);
    await this.mailService.sendVerificationEmail(
      user.email,
      plainCode,
      user.name,
    );

    return { message: 'Codigo reenviado com sucesso' };
  }

  async login(dto: LoginDto) {
    await this.assertLoginNotLocked(dto.email);

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      await this.recordFailedLogin(dto.email);
      throw AppError.emailNotFound();
    }

    if (!user.password) {
      await this.recordFailedLogin(dto.email);
      throw AppError.emailNotFound();
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      await this.recordFailedLogin(dto.email);
      throw AppError.invalidPassword();
    }

    if (!user.isEmailVerified) {
      throw AppError.emailNotVerified();
    }

    // 2FA: if enabled, do NOT issue access/refresh tokens yet. Hand back a
    // short-lived temporary token that only authorizes verify-2fa.
    if (user.twoFactorEnabled) {
      const temporaryToken = await this.issueTwoFactorPendingToken(user.id);
      return { twoFactorRequired: true as const, temporaryToken, userId: user.id };
    }

    await this.clearFailedLogins(dto.email);

    const { accessToken, refreshToken } = await this.generateTokens(
      user.id,
      user.email,
      user.role,
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        isFirstAccess: user.isFirstAccess,
        isEmailVerified: user.isEmailVerified,
        role: user.role,
      },
    };
  }

  /**
   * Issues a short-lived (5 min) JWT that only authorizes verify-2fa.
   * Persists a Redis nonce with matching TTL to prevent reuse after expiry.
   */
  private async issueTwoFactorPendingToken(userId: string): Promise<string> {
    const nonce = crypto.randomUUID();
    const token = this.jwtService.sign(
      { sub: userId, purpose: '2fa-pending', nonce },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '5m',
      },
    );
    await this.redisService.set(
      `2fa:pending:${nonce}`,
      userId,
      5 * 60,
    );
    return token;
  }

  /**
   * Completes login after the user submits a TOTP/backup code.
   * Validates the pending token + nonce, verifies the code, then issues
   * real access/refresh tokens. Pending nonce is consumed (single-use).
   */
  async verifyLogin2fa(temporaryToken: string, code: string) {
    let payload: { sub: string; purpose?: string; nonce?: string };
    try {
      payload = this.jwtService.verify(temporaryToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch {
      throw AppError.invalidOrExpiredCode();
    }

    if (payload.purpose !== '2fa-pending' || !payload.nonce) {
      throw AppError.invalidOrExpiredCode();
    }

    const userId = await this.redisService.get(`2fa:pending:${payload.nonce}`);
    if (!userId || userId !== payload.sub) {
      throw AppError.invalidOrExpiredCode();
    }

    const ok = await this.twoFactorService.verifyToken(payload.sub, code);
    if (!ok) {
      throw AppError.invalidOrExpiredCode();
    }

    // Consume the nonce so the temporary token can't be replayed.
    await this.redisService.del(`2fa:pending:${payload.nonce}`);

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw AppError.emailNotFound();
    }

    await this.clearFailedLogins(user.email);

    const { accessToken, refreshToken } = await this.generateTokens(
      user.id,
      user.email,
      user.role,
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        isFirstAccess: user.isFirstAccess,
        isEmailVerified: user.isEmailVerified,
        role: user.role,
      },
    };
  }

  async loginWithGoogle(dto: GoogleAuthDto) {
    const googleUser = await this.verifyGoogleToken(dto.token);

    let user = await this.prisma.user.findUnique({
      where: { googleId: googleUser.sub },
    });

    if (!user) {
      user = await this.prisma.user.findUnique({
        where: { email: googleUser.email },
      });

      if (user) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { googleId: googleUser.sub, isEmailVerified: true },
        });
      } else {
        user = await this.prisma.user.create({
          data: {
            email: googleUser.email!,
            name: googleUser.name || googleUser.email!.split('@')[0],
            avatarUrl: googleUser.picture || null,
            googleId: googleUser.sub,
            isFirstAccess: true,
            isEmailVerified: true,
          },
        });
      }
    }

    const { accessToken, refreshToken } = await this.generateTokens(
      user.id,
      user.email,
      user.role,
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        isFirstAccess: user.isFirstAccess,
        isEmailVerified: user.isEmailVerified,
        role: user.role,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    // Reuse detection: a previously-rotated token showing up again means theft.
    const rotatedOwner = await this.redisService.get(`refresh:rotated:${refreshToken}`);
    if (rotatedOwner) {
      // Revoke the entire family of tokens for this user (defense in depth).
      await this.prisma.refreshToken.deleteMany({ where: { userId: rotatedOwner } });
      await this.redisService.del(`refresh:rotated:${refreshToken}`);
      throw AppError.invalidRefreshToken();
    }

    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw AppError.invalidRefreshToken();
    }

    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    // Mark this token as rotated (7d window matches refresh TTL).
    await this.redisService.set(
      `refresh:rotated:${refreshToken}`,
      stored.userId,
      7 * 24 * 60 * 60,
    );

    const {
      accessToken,
      refreshToken: newRefreshToken,
    } = await this.generateTokens(stored.user.id, stored.user.email, stored.user.role);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: {
        id: stored.user.id,
        email: stored.user.email,
        name: stored.user.name,
        avatarUrl: stored.user.avatarUrl,
        isFirstAccess: stored.user.isFirstAccess,
        isEmailVerified: stored.user.isEmailVerified,
        role: stored.user.role,
      },
    };
  }

  async logout(userId: string, jti?: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
    // Revoke the current access token for its remaining lifetime (15 min default).
    if (jti) {
      await this.redisService.set(`revoked:jwt:${jti}`, '1', 15 * 60);
    }
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always return success to prevent email enumeration
    if (!user || !user.password) {
      return { message: 'Se o email existir, voce recebera o codigo de redefinicao.' };
    }

    const code = String(crypto.randomInt(100000, 1000000));
    const redisKey = `reset:${email}`;
    await this.redisService.set(redisKey, code, 15 * 60); // 15 min TTL

    await this.mailService.sendPasswordResetEmail(email, code, user.name);

    return { message: 'Se o email existir, voce recebera o codigo de redefinicao.' };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    const redisKey = `reset:${email}`;
    const storedCode = await this.redisService.get(redisKey);

    if (!storedCode) {
      throw AppError.resetTokenExpired();
    }

    if (storedCode !== code) {
      throw AppError.resetTokenInvalid();
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw AppError.userNotFound();
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    await this.redisService.del(redisKey);

    // Invalidate all refresh tokens for security
    await this.prisma.refreshToken.deleteMany({ where: { userId: user.id } });

    return { message: 'Senha redefinida com sucesso.' };
  }

  // Progressive lockout: 5 fails → 15min, 10 → 1h, 15 → 24h
  private static readonly LOCK_STEPS: Array<{ fails: number; ttl: number }> = [
    { fails: 5, ttl: 15 * 60 },
    { fails: 10, ttl: 60 * 60 },
    { fails: 15, ttl: 24 * 60 * 60 },
  ];

  private async assertLoginNotLocked(email: string): Promise<void> {
    const client = this.redisService.getClient();
    const ttl = await client.pttl(`login:lock:${email}`);
    if (ttl && ttl > 0) {
      const minutes = Math.ceil(ttl / 60000);
      throw new UnauthorizedException(
        `Conta temporariamente bloqueada. Tente novamente em ${minutes} minuto(s).`,
      );
    }
  }

  private async recordFailedLogin(email: string): Promise<void> {
    const client = this.redisService.getClient();
    const key = `login:fail:${email}`;
    const count = await client.incr(key);
    if (count === 1) {
      await client.expire(key, 15 * 60);
    }
    for (const step of AuthService.LOCK_STEPS) {
      if (count === step.fails) {
        await this.redisService.set(`login:lock:${email}`, String(count), step.ttl);
        break;
      }
    }
  }

  private async clearFailedLogins(email: string): Promise<void> {
    await this.redisService.del(`login:fail:${email}`);
    await this.redisService.del(`login:lock:${email}`);
  }

  async getUserFor2faStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, twoFactorEnabled: true, twoFactorBackupCodes: true },
    });
    if (!user) throw AppError.userNotFound();
    return user;
  }

  private async createVerificationCode(userId: string): Promise<string> {
    const plainCode = String(crypto.randomInt(100000, 1000000));
    const hashedCode = await bcrypt.hash(plainCode, 12);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.prisma.emailVerification.create({
      data: {
        code: hashedCode,
        userId,
        expiresAt,
      },
    });

    return plainCode;
  }

  private async verifyGoogleToken(token: string) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw AppError.invalidGoogleToken();
      }
      return payload;
    } catch {
      throw AppError.invalidGoogleToken();
    }
  }

  private async generateTokens(userId: string, email: string, role: string) {
    // Unique id per access token — enables per-token revocation on logout.
    const jti = crypto.randomUUID();
    const payload = { sub: userId, email, role, jti };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<number>('JWT_EXPIRES_IN') as any,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<number>(
        'JWT_REFRESH_EXPIRES_IN',
      ) as any,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }
}

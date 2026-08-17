import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';
import { Prisma } from '@prisma/client';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma.service';
import { AppError } from '../../common/errors/app-error';

authenticator.options = { digits: 6, step: 30, window: 1 };
const BACKUP_CODE_COUNT = 10;

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * Generates a new TOTP secret + otpauth URI + QR data URL for the user.
   * The secret is NOT persisted until verifySetup() is called with a valid code.
   */
  async beginSetup(userId: string, email: string) {
    const secret = authenticator.generateSecret();
    const issuer = this.configService.get<string>('TWO_FACTOR_ISSUER') ?? 'ToquePlay';
    const otpauthUri = authenticator.keyuri(email, issuer, secret);
    const qrDataUrl = await QRCode.toDataURL(otpauthUri);

    return { secret, otpauthUri, qrDataUrl };
  }

  /**
   * Verifies the user-provided 6-digit code against the secret and persists
   * 2FA on the user record. Returns one-time backup codes.
   */
  async verifyAndEnable(userId: string, secret: string, token: string) {
    const cleaned = token.replace(/\s+/g, '');
    if (!authenticator.verify({ token: cleaned, secret })) {
      throw AppError.invalidOrExpiredCode();
    }

    const backupCodes = this.generateBackupCodes();

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret,
        twoFactorEnabled: true,
        twoFactorBackupCodes: backupCodes.hashed,
      },
    });

    return { backupCodes: backupCodes.plain };
  }

  /** Disable 2FA for the user. */
  async disable(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: null,
        twoFactorEnabled: false,
        twoFactorBackupCodes: Prisma.JsonNull,
      },
    });
  }

  /**
   * Validates a token (or backup code) for a user. Returns true on success.
   * Backup codes are single-use: hashed version removed from store after use.
   */
  async verifyToken(userId: string, token: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorBackupCodes: true },
    });
    if (!user?.twoFactorSecret) return false;

    const cleaned = token.replace(/\s+/g, '');

    if (authenticator.verify({ token: cleaned, secret: user.twoFactorSecret })) {
      return true;
    }

    // Try backup codes
    const stored = (user.twoFactorBackupCodes ?? []) as string[];
    const tokenHash = this.hashBackupCode(cleaned);
    const idx = stored.indexOf(tokenHash);
    if (idx >= 0) {
      const remaining = stored.filter((_, i) => i !== idx);
      await this.prisma.user.update({
        where: { id: userId },
        data: { twoFactorBackupCodes: remaining },
      });
      return true;
    }

    return false;
  }

  private generateBackupCodes(): { plain: string[]; hashed: string[] } {
    const plain: string[] = [];
    const hashed: string[] = [];
    for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 hex chars
      plain.push(code);
      hashed.push(this.hashBackupCode(code));
    }
    return { plain, hashed };
  }

  private hashBackupCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }
}

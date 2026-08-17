import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

@Injectable()
export class AdminLoggerService {
  constructor(private prisma: PrismaService) {}

  async log(level: LogLevel, message: string, source?: string, stack?: string, metadata?: any) {
    await this.prisma.adminLog.create({
      data: {
        level,
        message,
        source: source ?? null,
        stack: stack ?? null,
        metadata: metadata ?? undefined,
      },
    });
  }

  info(message: string, source?: string, metadata?: any) {
    return this.log('INFO', message, source, undefined, metadata);
  }

  warn(message: string, source?: string, metadata?: any) {
    return this.log('WARN', message, source, undefined, metadata);
  }

  error(message: string, source?: string, stack?: string, metadata?: any) {
    return this.log('ERROR', message, source, stack, metadata);
  }

  async cleanup(retentionDays = 90) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);
    await this.prisma.adminLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
  }
}

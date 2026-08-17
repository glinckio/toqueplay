import { Injectable, OnModuleInit } from '@nestjs/common';
import * as Sentry from '@sentry/node';

@Injectable()
export class SentryService implements OnModuleInit {
  onModuleInit() {
    const dsn = process.env.SENTRY_DSN;
    if (!dsn) return;

    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 1.0,
    });
  }
}

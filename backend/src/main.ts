import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as Sentry from '@sentry/node';
import { AppModule } from './app.module';
import { SentryFilter } from './common/sentry/sentry.filter';
import { RedisIoAdapter } from './common/adapters/redis-io.adapter';

async function bootstrap() {
  // Init Sentry before app creation
  const dsn = process.env.SENTRY_DSN;
  if (dsn) {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 1.0,
      sendDefaultPii: false, // LGPD art. 46 — never leak email/IP/UA by default
      beforeSend(event) {
        // Scrub PII from request body + headers before any event leaves the process.
        const req = event.request;
        if (req) {
          if (req.headers) {
            delete req.headers['authorization'];
            delete req.headers['cookie'];
            delete req.headers['x-forwarded-for'];
          }
          if (req.data && typeof req.data === 'object') {
            const data = req.data as Record<string, unknown>;
            for (const k of [
              'password',
              'newPassword',
              'confirmPassword',
              'code',
              'refreshToken',
              'accessToken',
              'secret',
              'cpf',
            ]) {
              if (k in data) data[k] = '[redacted]';
            }
          }
        }
        // Mask user.email but keep a stable hash for correlation.
        if (event.user?.email) {
          const crypto = require('crypto');
          const hash = crypto.createHash('sha256').update(event.user.email).digest('hex').slice(0, 12);
          event.user.email = `redacted+${hash}@scrubbed.local`;
        }
        return event;
      },
    });
  }

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  app.setGlobalPrefix('api');

  app.use(
    helmet({
      contentSecurityPolicy: false, // API does not serve HTML
      crossOriginEmbedderPolicy: false, // avoid COEP issues with external CDNs
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'same-origin' },
      hsts: {
        maxAge: 63072000, // 2 years
        includeSubDomains: true,
        preload: true,
      },
      frameguard: { action: 'deny' },
      noSniff: true,
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );

  // Sentry request handler (must be before other middleware)
  if (dsn) {
    app.use(Sentry.expressIntegration());
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Sentry error handler + custom filter
  if (dsn) {
    Sentry.setupExpressErrorHandler(app);
  }
  app.useGlobalFilters(new SentryFilter());

  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : process.env.NODE_ENV === 'production'
      ? (() => {
          throw new Error('CORS_ORIGINS env var required in production');
        })()
      : ['http://localhost:3001', 'http://localhost:19006', 'exp://localhost:19000'];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  const config = new DocumentBuilder()
    .setTitle('ToquePlay API')
    .setDescription('API de torneios de vôlei')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`ToquePlay API running on http://localhost:${port}`);
  console.log(`Swagger docs at http://localhost:${port}/api/docs`);
}
bootstrap();

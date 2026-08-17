import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import * as Sentry from '@sentry/node';

@Catch()
export class SentryFilter implements ExceptionFilter {
  private readonly logger = new Logger(SentryFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Capture all non-HttpException errors (unexpected crashes) in Sentry
    if (!(exception instanceof HttpException)) {
      Sentry.captureException(exception);
    }
    // Capture 5xx HttpExceptions too
    if (exception instanceof HttpException && exception.getStatus() >= 500) {
      Sentry.captureException(exception);
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const excResponse = exception.getResponse();
      let message = exception.message;

      if (typeof excResponse === 'object' && excResponse !== null) {
        const obj = excResponse as Record<string, unknown>;
        if (obj.message) message = obj.message as string;
        if (obj.code) {
          return response.status(status).json({
            statusCode: status,
            code: obj.code,
            message,
          });
        }
      }

      return response.status(status).json({ statusCode: status, message });
    }

    this.logger.error(exception instanceof Error ? exception.stack ?? exception.message : String(exception));

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });
  }
}

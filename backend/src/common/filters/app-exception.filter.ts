import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthErrorMessages } from '../errors/auth-error.enum';
import { TeamsErrorMessages } from '../errors/teams-error.enum';
import { TournamentsErrorMessages } from '../errors/tournaments-error.enum';
import { RegistrationsErrorMessages } from '../errors/registrations-error.enum';
import { BracketsErrorMessages } from '../errors/brackets-error.enum';
import { MatchesErrorMessages } from '../errors/matches-error.enum';
import { FriendliesErrorMessages } from '../errors/friendlies-error.enum';

const allErrorMessages = {
  ...AuthErrorMessages,
  ...TeamsErrorMessages,
  ...TournamentsErrorMessages,
  ...RegistrationsErrorMessages,
  ...BracketsErrorMessages,
  ...MatchesErrorMessages,
  ...FriendliesErrorMessages,
};

export interface AppErrorResponse {
  statusCode: number;
  code: string;
  message: string;
}

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AppExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const excResponse = exception.getResponse();

      let code: string | undefined;
      let message: string | undefined;

      if (typeof excResponse === 'object' && excResponse !== null) {
        const obj = excResponse as Record<string, unknown>;
        code = obj.code as string | undefined;
        message = obj.message as string | undefined;
      }

      if (code && allErrorMessages[code as keyof typeof allErrorMessages]) {
        return response.status(status).json({
          statusCode: status,
          code,
          message: allErrorMessages[code as keyof typeof allErrorMessages],
        } satisfies AppErrorResponse);
      }

      return response.status(status).json({
        statusCode: status,
        message: message || exception.message,
      });
    }

    const message =
      exception instanceof Error ? exception.message : 'Internal server error';

    this.logger.error(exception instanceof Error ? exception.stack ?? exception.message : String(exception));

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message,
    });
  }
}

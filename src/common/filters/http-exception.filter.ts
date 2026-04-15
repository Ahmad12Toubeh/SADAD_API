import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

type ErrorResponse = {
  statusCode: number;
  message: string;
  code: string;
  messageKey: string;
  details?: unknown;
};

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception.getStatus();
    const res = exception.getResponse() as any;

    const message: string =
      typeof res === 'string'
        ? res
        : res?.message ?? exception.message ?? 'Request failed';

    let code = res?.code ?? 'HTTP_ERROR';
    let messageKey = res?.messageKey ?? 'errors.common.unknown';
    let details: unknown = undefined;

    // ValidationPipe errors come as array of messages.
    if (status === HttpStatus.BAD_REQUEST && Array.isArray(res?.message)) {
      code = 'VALIDATION_ERROR';
      messageKey = 'errors.validation.invalid';
      details = res.message;
    } else if (status === HttpStatus.UNAUTHORIZED) {
      code = 'AUTH_INVALID_CREDENTIALS';
      messageKey = 'errors.auth.invalidCredentials';
    } else if (status === HttpStatus.CONFLICT) {
      code = 'AUTH_EMAIL_ALREADY_REGISTERED';
      messageKey = 'errors.auth.emailAlreadyRegistered';
    } else if (status === HttpStatus.NOT_FOUND) {
      code = 'RESOURCE_NOT_FOUND';
      messageKey = 'errors.common.notFound';
    } else if (status === HttpStatus.FORBIDDEN && !res?.code) {
      code = 'FORBIDDEN';
      messageKey = 'errors.common.unknown';
    } else if (status === HttpStatus.BAD_REQUEST) {
      code = 'BAD_REQUEST';
      messageKey = 'errors.common.badRequest';
      details = res?.message ?? undefined;
    } else if (status >= 500) {
      code = 'INTERNAL_SERVER_ERROR';
      messageKey = 'errors.common.internalServerError';
    }

    const payload: ErrorResponse = {
      statusCode: status,
      message: typeof message === 'string' ? message : 'Request failed',
      code,
      messageKey,
      details,
    };

    // Avoid leaking internals to client; keep messageKey for i18n.
    response.status(status).json(payload);
  }
}

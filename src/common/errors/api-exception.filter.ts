import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ExceptionFilter } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { isMalformedJsonError } from './malformed-json';

type StandardErrorBody = Readonly<{
  statusCode: number;
  message: string;
}>;

/**
 * Keeps explicit contract errors intact and redacts unexpected failure details.
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const httpContext = host.switchToHttp();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : isMalformedJsonError(exception)
          ? HttpStatus.BAD_REQUEST
          : HttpStatus.INTERNAL_SERVER_ERROR;
    const responseBody = this.createResponseBody(exception, status);

    if (status >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.message : 'Unexpected error',
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    this.adapterHost.httpAdapter.reply(
      httpContext.getResponse(),
      responseBody,
      status,
    );
  }

  private createResponseBody(
    exception: unknown,
    status: number,
  ): object | StandardErrorBody {
    if (
      isMalformedJsonError(exception) ||
      this.isWrappedMalformedJsonException(exception)
    ) {
      return {
        accepted: 0,
        rejected: [],
      };
    }

    if (!(exception instanceof HttpException)) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      };
    }

    const explicitResponse = exception.getResponse();
    if (typeof explicitResponse === 'object') {
      return explicitResponse;
    }

    return {
      statusCode: status,
      message: explicitResponse,
    };
  }

  private isWrappedMalformedJsonException(exception: unknown): boolean {
    if (
      !(exception instanceof HttpException) ||
      exception.getStatus() !== HttpStatus.BAD_REQUEST
    ) {
      return false;
    }

    const response: unknown = exception.getResponse();
    if (
      typeof response !== 'object' ||
      response === null ||
      !('message' in response)
    ) {
      return false;
    }

    return (
      typeof response.message === 'string' &&
      response.message.toLowerCase().includes('json')
    );
  }
}

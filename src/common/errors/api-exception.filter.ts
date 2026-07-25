import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ExceptionFilter } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

type StandardErrorBody = Readonly<{
  statusCode: number;
  message: string;
}>;

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const httpContext = host.switchToHttp();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
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
}

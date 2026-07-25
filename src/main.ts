import { Logger, ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { json } from 'express';
import type { INestApplication } from '@nestjs/common';

import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/errors/api-exception.filter';
import { malformedJsonErrorHandler } from './common/errors/malformed-json';
import { loadConfiguration } from './config/configuration';
import { ReadinessService } from './health/readiness.service';

async function bootstrap(): Promise<void> {
  const configuration = loadConfiguration();
  const bootstrapLogger = new Logger('Bootstrap');
  let app: INestApplication | undefined;

  try {
    app = await NestFactory.create(AppModule, { bodyParser: false });
    app.enableShutdownHooks();
    app.use(
      json({
        limit: configuration.application.httpBodyLimitBytes,
        strict: true,
      }),
    );
    app.use(malformedJsonErrorHandler);
    app.useGlobalFilters(new ApiExceptionFilter(app.get(HttpAdapterHost)));

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
      }),
    );

    await app.get(ReadinessService).assertReady();

    const port = configuration.application.port;
    await app.listen(port, '0.0.0.0');
    bootstrapLogger.log(`Log Pulse is ready at http://localhost:${port}`);
  } catch (error: unknown) {
    bootstrapLogger.error(
      `Application startup failed: ${
        error instanceof Error ? error.message : 'unknown startup error'
      }`,
      error instanceof Error ? error.stack : undefined,
    );
    await app?.close();
    process.exitCode = 1;
  }
}

void bootstrap();

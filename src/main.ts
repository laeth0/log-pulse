import 'dotenv/config';

import { Logger, ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { json } from 'express';
import type { INestApplication } from '@nestjs/common';

import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/errors/api-exception.filter';

async function bootstrap(): Promise<void> {
  const bootstrapLogger = new Logger('Bootstrap');
  let app: INestApplication | undefined;

  try {
    app = await NestFactory.create(AppModule, { bodyParser: false });
    app.enableShutdownHooks();
    app.use(
      json({
        limit: Number(process.env.HTTP_BODY_LIMIT_BYTES) || 52_428_800,
        strict: true,
      }),
    );
    app.useGlobalFilters(new ApiExceptionFilter(app.get(HttpAdapterHost)));

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
      }),
    );

    const port = Number(process.env.PORT) || 8080;
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

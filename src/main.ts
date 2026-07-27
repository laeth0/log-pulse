import 'dotenv/config';

import { Logger } from '@nestjs/common';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { json } from 'express';

import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/errors/api-exception.filter';

async function bootstrap(): Promise<void> {
  const bootstrapLogger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  app.enableShutdownHooks();
  app.use(
    json({
      limit: Number(process.env.HTTP_BODY_LIMIT_BYTES) || 52_428_800,
      strict: true,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter(app.get(HttpAdapterHost)));

  const port = Number(process.env.PORT) || 8080;
  await app.listen(port, '0.0.0.0');
  bootstrapLogger.log(`Log Pulse is ready at http://localhost:${port}`);
}

void bootstrap();

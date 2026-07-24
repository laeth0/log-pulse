import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  app.enableShutdownHooks();

  // Global validation pipe — rejects requests with invalid DTOs automatically
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown properties
      forbidNonWhitelisted: false,
      transform: true, // auto-transform payloads to DTO class instances
    }),
  );

  const port = process.env.PORT ?? 8080;
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 Log Pulse is running on http://localhost:${port}`);
  logger.log(`   GET http://localhost:${port}/health`);
}

void bootstrap();

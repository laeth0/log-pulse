import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppDataSource } from './config/data-source';
import { LogsModule } from './logs/logs.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...AppDataSource.options,
      migrationsRun: false,
    }),
    HealthModule,
    LogsModule,
  ],
})
export class AppModule {}

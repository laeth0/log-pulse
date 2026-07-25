import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppDataSource } from './config/data-source';
import { LogsModule } from './logs/logs.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      ...AppDataSource.options,
      migrationsRun: false,
    }),
    HealthModule,
    LogsModule,
  ],
})
export class AppModule {}

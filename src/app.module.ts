import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  createDatabaseOptions,
  loadConfiguration,
} from './config/configuration';
import { LogsModule } from './logs/logs.module';
import { HealthModule } from './health/health.module';

const applicationConfiguration = loadConfiguration();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [() => applicationConfiguration],
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      ...createDatabaseOptions(applicationConfiguration),
      migrationsRun: false,
    }),
    HealthModule,
    LogsModule,
  ],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Clock } from '../common/time/clock';
import { SystemClock } from '../common/time/system-clock';
import { Log } from './entities/log.entity';
import { LogsController } from './logs.controller';
import { LogsService } from './logs.service';
import { LogsRepository } from './persistence/logs.repository';
import { LogAggregationQuery } from './persistence/log-aggregation.query';
import { LogQueryCursorCodec } from './query/log-query-cursor.codec';
import { LogRetentionConfig } from './retention/log-retention.config';
import { LogRetentionRepository } from './retention/log-retention.repository';
import { LogRetentionScheduler } from './retention/log-retention.scheduler';

@Module({
  imports: [TypeOrmModule.forFeature([Log])],
  controllers: [LogsController],
  providers: [
    LogsService,
    LogsRepository,
    LogAggregationQuery,
    LogQueryCursorCodec,
    LogRetentionConfig,
    LogRetentionRepository,
    LogRetentionScheduler,
    { provide: Clock, useClass: SystemClock },
  ],
})
export class LogsModule {}

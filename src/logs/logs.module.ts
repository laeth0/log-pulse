import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Clock } from '../common/time/clock';
import { SystemClock } from '../common/time/system-clock';
import { Log } from './entities/log.entity';
import { LogsController } from './logs.controller';
import { LogsService } from './logs.service';
import { LogsRepository } from './persistence/logs.repository';
import { LogAggregationQuery } from './persistence/log-aggregation.query';
import { LogFilterQueryBuilder } from './persistence/log-filter-query.builder';
import { LogAggregateQueryParser } from './query/log-aggregate-query.parser';
import { LogFilterParser } from './query/log-filter.parser';
import { LogQueryCursorCodec } from './query/log-query-cursor.codec';
import { LogQueryParser } from './query/log-query.parser';
import { LogRetentionConfig } from './retention/log-retention.config';
import { LogRetentionRepository } from './retention/log-retention.repository';
import { LogRetentionScheduler } from './retention/log-retention.scheduler';
import { LogTimestampValidator } from './validation/log-timestamp.validator';
import { LogBatchValidator } from './validation/log-batch.validator';
import { LogEntryValidator } from './validation/log-entry.validator';

@Module({
  imports: [TypeOrmModule.forFeature([Log])],
  controllers: [LogsController],
  providers: [
    LogsService,
    LogsRepository,
    LogAggregationQuery,
    LogFilterQueryBuilder,
    LogBatchValidator,
    LogEntryValidator,
    LogTimestampValidator,
    LogQueryCursorCodec,
    LogFilterParser,
    LogQueryParser,
    LogAggregateQueryParser,
    LogRetentionConfig,
    LogRetentionRepository,
    LogRetentionScheduler,
    { provide: Clock, useClass: SystemClock },
  ],
})
export class LogsModule {}

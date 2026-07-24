import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Clock } from '../common/time/clock';
import { SystemClock } from '../common/time/system-clock';
import { Log } from './entities/log.entity';
import { LogEntryValidator } from './log-entry.validator';
import { LogsController } from './logs.controller';
import { LogsService } from './logs.service';
import { LogAggregateQueryParser } from './query/log-aggregate-query.parser';
import { LogFilterParser } from './query/log-filter.parser';
import { LogQueryCursorCodec } from './query/log-query-cursor.codec';
import { LogQueryParser } from './query/log-query.parser';
import { LogTimestampValidator } from './validation/log-timestamp.validator';

@Module({
  imports: [TypeOrmModule.forFeature([Log])],
  controllers: [LogsController],
  providers: [
    LogsService,
    LogEntryValidator,
    LogTimestampValidator,
    LogQueryCursorCodec,
    LogFilterParser,
    LogQueryParser,
    LogAggregateQueryParser,
    { provide: Clock, useClass: SystemClock },
  ],
})
export class LogsModule {}

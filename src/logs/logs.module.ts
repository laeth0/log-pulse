import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Clock } from '../common/time/clock';
import { SystemClock } from '../common/time/system-clock';
import { Log } from './entities/log.entity';
import { LogsController } from './logs.controller';
import { LogQueryCursorCodec } from './log-query-cursor.codec';
import { LogsRepository } from './logs.repository';
import { LogsService } from './logs.service';

@Module({
  imports: [TypeOrmModule.forFeature([Log])],
  controllers: [LogsController],
  providers: [
    LogsService,
    LogsRepository,
    LogQueryCursorCodec,
    { provide: Clock, useClass: SystemClock },
  ],
})
export class LogsModule {}

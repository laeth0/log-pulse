import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { IngestLogsDto } from './dto/ingest-logs.dto';
import { IngestLogsResponseDto } from './dto/ingest-logs-response.dto';
import { LogAggregateResponseDto } from './dto/log-aggregate-response.dto';
import { QueryLogsResponseDto } from './dto/query-logs-response.dto';
import { LogsService } from './logs.service';
import type { LogAggregateQuery } from './models/log-aggregate-query';
import type { LogQuery } from './models/log-query';
import type { ValidatedIngestLogs } from './models/validated-ingest-logs';
import { LogAggregateQueryParser } from './query/log-aggregate-query.parser';
import { LogQueryParser } from './query/log-query.parser';
import { LogBatchValidator } from './validation/log-batch.validator';

@ApiTags('logs')
@Controller('logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ingest a batch of structured logs' })
  @ApiBody({ type: IngestLogsDto })
  @ApiOkResponse({ type: IngestLogsResponseDto })
  ingestLogs(
    @Body(LogBatchValidator) ingestionRequest: ValidatedIngestLogs,
  ): Promise<IngestLogsResponseDto> {
    return this.logsService.ingestLogs(ingestionRequest);
  }

  @Get()
  @ApiOperation({ summary: 'Query stored logs' })
  @ApiQuery({ name: 'service', required: false, type: String })
  @ApiQuery({
    name: 'level',
    required: false,
    enum: ['debug', 'info', 'warn', 'error'],
  })
  @ApiQuery({ name: 'since', required: false, type: String })
  @ApiQuery({ name: 'until', required: false, type: String })
  @ApiQuery({
    name: 'attr.<key>',
    required: false,
    type: String,
    description: 'Attribute equality filter, for example attr.user_id=42.',
  })
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Defaults to 100 and is capped at 1000.',
  })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiOkResponse({ type: QueryLogsResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid query parameters.' })
  queryLogs(
    @Query(LogQueryParser) logQuery: LogQuery,
  ): Promise<QueryLogsResponseDto> {
    return this.logsService.queryLogs(logQuery);
  }

  @Get('aggregate')
  @ApiOperation({ summary: 'Aggregate log counts into time buckets' })
  @ApiQuery({ name: 'since', required: true, type: String })
  @ApiQuery({ name: 'until', required: true, type: String })
  @ApiQuery({
    name: 'bucket',
    required: true,
    enum: ['1m', '5m', '1h', '1d'],
  })
  @ApiQuery({
    name: 'group_by',
    required: false,
    enum: ['service', 'level'],
  })
  @ApiQuery({ name: 'service', required: false, type: String })
  @ApiQuery({
    name: 'level',
    required: false,
    enum: ['debug', 'info', 'warn', 'error'],
  })
  @ApiQuery({
    name: 'attr.<key>',
    required: false,
    type: String,
    description: 'Attribute equality filter, for example attr.user_id=42.',
  })
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiOkResponse({ type: LogAggregateResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid aggregation parameters.' })
  aggregateLogs(
    @Query(LogAggregateQueryParser) aggregateQuery: LogAggregateQuery,
  ): Promise<LogAggregateResponseDto> {
    return this.logsService.aggregateLogs(aggregateQuery);
  }
}

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

import { LogLevel } from '../common/enums/log-level.enum';
import { Clock } from '../common/time/clock';
import { IngestLogsDto } from './dto/request/ingest-logs.dto';
import { IngestLogsResponseDto } from './dto/response/ingest-logs-response.dto';
import { LogAggregateResponseDto } from './dto/response/log-aggregate-response.dto';
import { QueryLogsResponseDto } from './dto/response/query-logs-response.dto';
import { LogsService } from './logs.service';
import { LogQueryCursorCodec } from './query/log-query-cursor.codec';
import {
  parseLogAggregateQuery,
  parseLogQuery,
} from './validation/log-query.validation';
import { parseIngestLogs } from './validation/log-ingestion.validation';

@ApiTags('logs')
@Controller('logs')
export class LogsController {
  constructor(
    private readonly logsService: LogsService,
    private readonly logQueryCursorCodec: LogQueryCursorCodec,
    private readonly clock: Clock,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ingest a batch of structured logs' })
  @ApiBody({ type: IngestLogsDto })
  @ApiOkResponse({ type: IngestLogsResponseDto })
  ingestLogs(@Body() request: unknown): Promise<IngestLogsResponseDto> {
    const ingestionRequest = parseIngestLogs(request, this.clock.now());

    return this.logsService.ingestLogs(ingestionRequest);
  }

  @Get()
  @ApiOperation({ summary: 'Query stored logs' })
  @ApiQuery({ name: 'service', required: false, type: String })
  @ApiQuery({
    name: 'level',
    required: false,
    enum: LogLevel,
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
    @Query() rawQuery: Readonly<Record<string, unknown>>,
  ): Promise<QueryLogsResponseDto> {
    const logQuery = parseLogQuery(rawQuery, this.logQueryCursorCodec);

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
    enum: LogLevel,
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
    @Query() rawQuery: Readonly<Record<string, unknown>>,
  ): Promise<LogAggregateResponseDto> {
    const aggregateQuery = parseLogAggregateQuery(rawQuery);

    return this.logsService.aggregateLogs(aggregateQuery);
  }
}

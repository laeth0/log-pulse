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
import { LogAggregateQueryParser } from './query/log-aggregate-query.parser';
import { LogQueryParser } from './query/log-query.parser';

@ApiTags('logs')
@Controller('logs')
export class LogsController {
  constructor(
    private readonly logsService: LogsService,
    private readonly logQueryParser: LogQueryParser,
    private readonly logAggregateQueryParser: LogAggregateQueryParser,
  ) {}

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
    @Query() rawQueryParameters: Readonly<Record<string, unknown>>,
  ): Promise<LogAggregateResponseDto> {
    return this.logsService.aggregateLogs(
      this.logAggregateQueryParser.parse(rawQueryParameters),
    );
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
    @Query() rawQueryParameters: Readonly<Record<string, unknown>>,
  ): Promise<QueryLogsResponseDto> {
    return this.logsService.queryLogs(
      this.logQueryParser.parse(rawQueryParameters),
    );
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ingest a batch of structured logs' })
  @ApiBody({ type: IngestLogsDto })
  @ApiOkResponse({ type: IngestLogsResponseDto })
  @ApiBadRequestResponse({
    description: 'The request is malformed or every entry was rejected.',
  })
  ingestLogs(
    @Body() ingestionRequest: IngestLogsDto,
  ): Promise<IngestLogsResponseDto> {
    return this.logsService.ingestLogs(ingestionRequest);
  }
}

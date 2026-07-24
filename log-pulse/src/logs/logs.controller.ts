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
import { QueryLogsResponseDto } from './dto/query-logs-response.dto';
import { LogsService } from './logs.service';
import { LogQueryParser } from './query/log-query.parser';

@ApiTags('logs')
@Controller('logs')
export class LogsController {
  constructor(
    private readonly logsService: LogsService,
    private readonly logQueryParser: LogQueryParser,
  ) {}

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
  find(
    @Query() rawQuery: Readonly<Record<string, unknown>>,
  ): Promise<QueryLogsResponseDto> {
    return this.logsService.find(this.logQueryParser.parse(rawQuery));
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ingest a batch of structured logs' })
  @ApiBody({ type: IngestLogsDto })
  @ApiOkResponse({ type: IngestLogsResponseDto })
  @ApiBadRequestResponse({
    description: 'The request is malformed or every entry was rejected.',
  })
  ingest(@Body() request: IngestLogsDto): Promise<IngestLogsResponseDto> {
    return this.logsService.ingest(request);
  }
}

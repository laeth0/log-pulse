import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { IngestLogsDto } from './dto/ingest-logs.dto';
import { IngestLogsResponseDto } from './dto/ingest-logs-response.dto';
import { LogsService } from './logs.service';

@ApiTags('logs')
@Controller('logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

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

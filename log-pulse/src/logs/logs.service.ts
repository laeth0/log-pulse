import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { IngestLogsDto } from './dto/ingest-logs.dto';
import { IngestLogsResponseDto } from './dto/ingest-logs-response.dto';
import { RejectedLogDto } from './dto/rejected-log.dto';
import { Log } from './entities/log.entity';
import { LogEntryValidator } from './log-entry.validator';
import { LogEntry } from './models/log-entry';

/** Coordinates validation and persistence for log ingestion. */
@Injectable()
export class LogsService {
  private readonly logger = new Logger(LogsService.name);

  constructor(
    @InjectRepository(Log)
    private readonly logRepository: Repository<Log>,
    private readonly logEntryValidator: LogEntryValidator,
  ) {}

  async ingest(request: IngestLogsDto): Promise<IngestLogsResponseDto> {
    const acceptedLogs: LogEntry[] = [];
    const rejectedLogs: RejectedLogDto[] = [];

    request.logs.forEach((input: unknown, index: number): void => {
      const result = this.logEntryValidator.validate(input);

      if (result.isValid) {
        acceptedLogs.push(result.log);
        return;
      }

      rejectedLogs.push({ index, reason: result.reason });
    });

    const response: IngestLogsResponseDto = {
      accepted: acceptedLogs.length,
      rejected: rejectedLogs,
    };

    if (acceptedLogs.length === 0) {
      throw new BadRequestException(response);
    }

    await this.persist(acceptedLogs);
    return response;
  }

  private async persist(logs: readonly LogEntry[]): Promise<void> {
    try {
      await this.logRepository.insert([...logs]);
    } catch (error: unknown) {
      this.logger.error('Failed to persist an ingestion batch');
      throw new InternalServerErrorException('Failed to ingest logs', {
        cause: error,
      });
    }
  }
}

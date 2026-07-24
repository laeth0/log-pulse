import { BadRequestException, Injectable } from '@nestjs/common';

import {
  DEFAULT_LOG_QUERY_LIMIT,
  MAX_LOG_QUERY_LIMIT,
  NUMERIC_LIMIT_PATTERN,
} from '../../common/const/log-query.const';
import { LogQuery } from '../models/log-query';
import { LogFilterParser } from './log-filter.parser';
import { LogQueryCursorCodec } from './log-query-cursor.codec';

/** Converts untrusted HTTP query parameters into a validated application query. */
@Injectable()
export class LogQueryParser {
  constructor(
    private readonly logFilterParser: LogFilterParser,
    private readonly logQueryCursorCodec: LogQueryCursorCodec,
  ) {}

  parse(rawQueryParameters: Readonly<Record<string, unknown>>): LogQuery {
    const logFilters = this.logFilterParser.parse(rawQueryParameters);
    const resultLimit = this.parseLimit(rawQueryParameters.limit);
    const paginationCursor = this.parseCursor(rawQueryParameters.cursor);

    return {
      ...logFilters,
      limit: resultLimit,
      ...(paginationCursor !== undefined && { cursor: paginationCursor }),
    };
  }

  private parseLimit(rawLimit: unknown): number {
    if (rawLimit === undefined) {
      return DEFAULT_LOG_QUERY_LIMIT;
    }

    if (typeof rawLimit !== 'string' || !NUMERIC_LIMIT_PATTERN.test(rawLimit)) {
      this.reject('limit must be numeric');
    }

    const requestedLimit = Number(rawLimit);
    if (requestedLimit < 1) {
      this.reject('limit must be greater than zero');
    }

    return Math.min(requestedLimit, MAX_LOG_QUERY_LIMIT);
  }

  private parseCursor(rawCursor: unknown): LogQuery['cursor'] {
    if (rawCursor === undefined) {
      return undefined;
    }

    if (typeof rawCursor !== 'string') {
      this.reject('invalid cursor');
    }

    const paginationCursor = this.logQueryCursorCodec.decode(rawCursor);
    if (!paginationCursor) {
      this.reject('invalid cursor');
    }

    return paginationCursor;
  }

  private reject(message: string): never {
    throw new BadRequestException({ error: message });
  }
}

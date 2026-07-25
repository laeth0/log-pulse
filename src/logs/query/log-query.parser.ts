import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

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
export class LogQueryParser implements PipeTransform<
  Readonly<Record<string, unknown>>,
  LogQuery
> {
  constructor(
    private readonly logFilterParser: LogFilterParser,
    private readonly logQueryCursorCodec: LogQueryCursorCodec,
  ) {}

  transform(rawQueryParameters: Readonly<Record<string, unknown>>): LogQuery {
    this.logFilterParser.assertKnownParameters(rawQueryParameters, [
      'limit',
      'cursor',
    ]);
    const filters = this.logFilterParser.parse(rawQueryParameters);
    const limit = this.parseLimit(rawQueryParameters.limit);
    const cursor = this.parseCursor(rawQueryParameters.cursor);

    return {
      ...filters,
      limit,
      cursor,
    };
  }

  private parseLimit(rawLimit: unknown): number {
    if (rawLimit === undefined) {
      return DEFAULT_LOG_QUERY_LIMIT;
    }

    if (typeof rawLimit !== 'string' || !NUMERIC_LIMIT_PATTERN.test(rawLimit)) {
      throw new BadRequestException({ error: 'limit must be numeric' });
    }

    const limit = Number(rawLimit);
    if (limit < 1) {
      throw new BadRequestException({
        error: 'limit must be greater than zero',
      });
    }

    return Math.min(limit, MAX_LOG_QUERY_LIMIT);
  }

  private parseCursor(rawCursor: unknown): LogQuery['cursor'] {
    if (rawCursor === undefined) {
      return undefined;
    }

    if (typeof rawCursor !== 'string') {
      throw new BadRequestException({ error: 'invalid cursor' });
    }

    const cursor = this.logQueryCursorCodec.decode(rawCursor);
    if (cursor === null) {
      throw new BadRequestException({ error: 'invalid cursor' });
    }

    return cursor;
  }
}

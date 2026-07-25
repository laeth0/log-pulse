import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

import {
  BASE64_URL_PATTERN,
  LOG_QUERY_CURSOR_SCHEMA,
  MAX_LOG_QUERY_CURSOR_LENGTH,
} from '../../common/const/log-query-cursor.const';
import { LogQueryCursor } from '../models/log-query-cursor';
import type { LogFilters } from '../models/log-filters';

type CursorPosition = Readonly<{
  timestamp: Date;
  id: string;
}>;

/** Encodes and safely decodes opaque keyset-pagination cursors. */
@Injectable()
export class LogQueryCursorCodec {
  encode(paginationCursor: CursorPosition, filters: LogFilters): string {
    const serializedCursor = JSON.stringify({
      v: 1,
      timestamp: paginationCursor.timestamp.toISOString(),
      id: paginationCursor.id,
      filterFingerprint: this.createFilterFingerprint(filters),
    });

    return Buffer.from(serializedCursor, 'utf8').toString('base64url');
  }

  decode(encodedCursor: string, filters: LogFilters): LogQueryCursor | null {
    if (
      encodedCursor.length === 0 ||
      encodedCursor.length > MAX_LOG_QUERY_CURSOR_LENGTH ||
      !BASE64_URL_PATTERN.test(encodedCursor)
    ) {
      return null;
    }

    try {
      const decodedCursorPayload: unknown = JSON.parse(
        Buffer.from(encodedCursor, 'base64url').toString('utf8'),
      );
      const parsedCursor =
        LOG_QUERY_CURSOR_SCHEMA.safeParse(decodedCursorPayload);

      if (!parsedCursor.success) {
        return null;
      }

      const expectedFingerprint = this.createFilterFingerprint(filters);
      if (parsedCursor.data.filterFingerprint !== expectedFingerprint) {
        return null;
      }

      return {
        v: parsedCursor.data.v,
        timestamp: new Date(parsedCursor.data.timestamp),
        id: parsedCursor.data.id,
        filterFingerprint: parsedCursor.data.filterFingerprint,
      };
    } catch {
      return null;
    }
  }

  private createFilterFingerprint(filters: LogFilters): string {
    const canonicalFilters = {
      service: filters.service ?? null,
      level: filters.level ?? null,
      since: filters.since?.toISOString() ?? null,
      until: filters.until?.toISOString() ?? null,
      attributes: [...filters.attributes].sort(
        ([leftName, leftValue], [rightName, rightValue]) => {
          const nameComparison = leftName.localeCompare(rightName);
          return nameComparison === 0
            ? leftValue.localeCompare(rightValue)
            : nameComparison;
        },
      ),
      messageQuery: filters.messageQuery ?? null,
    };

    return createHash('sha256')
      .update(JSON.stringify(canonicalFilters), 'utf8')
      .digest('hex');
  }
}

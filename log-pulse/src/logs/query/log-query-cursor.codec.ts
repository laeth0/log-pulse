import { Injectable } from '@nestjs/common';

import {
  BASE64_URL_PATTERN,
  LOG_QUERY_CURSOR_SCHEMA,
  MAX_LOG_QUERY_CURSOR_LENGTH,
} from '../../common/const/log-query-cursor.const';
import { LogQueryCursor } from '../models/log-query-cursor';

/** Encodes and safely decodes opaque keyset-pagination cursors. */
@Injectable()
export class LogQueryCursorCodec {
  encode(cursor: LogQueryCursor): string {
    const payload = JSON.stringify({
      timestamp: cursor.timestamp.toISOString(),
      id: cursor.id,
    });

    return Buffer.from(payload, 'utf8').toString('base64url');
  }

  decode(encodedCursor: string): LogQueryCursor | null {
    if (
      encodedCursor.length === 0 ||
      encodedCursor.length > MAX_LOG_QUERY_CURSOR_LENGTH ||
      !BASE64_URL_PATTERN.test(encodedCursor)
    ) {
      return null;
    }

    try {
      const payload: unknown = JSON.parse(
        Buffer.from(encodedCursor, 'base64url').toString('utf8'),
      );
      const parsedCursor = LOG_QUERY_CURSOR_SCHEMA.safeParse(payload);

      if (!parsedCursor.success) {
        return null;
      }

      return {
        timestamp: new Date(parsedCursor.data.timestamp),
        id: parsedCursor.data.id,
      };
    } catch {
      return null;
    }
  }
}

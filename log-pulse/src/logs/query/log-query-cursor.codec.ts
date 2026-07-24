import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { LogQueryCursor } from '../models/log-query-cursor';

const MAX_CURSOR_LENGTH = 4_096;
const BASE64_URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const CURSOR_SCHEMA = z
  .object({
    timestamp: z.iso.datetime({ offset: true }),
    id: z.string().regex(/^[1-9]\d*$/),
  })
  .strict();

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
      encodedCursor.length > MAX_CURSOR_LENGTH ||
      !BASE64_URL_PATTERN.test(encodedCursor)
    ) {
      return null;
    }

    try {
      const payload: unknown = JSON.parse(
        Buffer.from(encodedCursor, 'base64url').toString('utf8'),
      );
      const parsedCursor = CURSOR_SCHEMA.safeParse(payload);

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

import { z } from 'zod';

export const MAX_LOG_QUERY_CURSOR_LENGTH = 4_096;
export const BASE64_URL_PATTERN = /^[A-Za-z0-9_-]+$/;
export const LOG_QUERY_CURSOR_SCHEMA = z
  .object({
    timestamp: z.iso.datetime({ offset: true }),
    id: z.string().regex(/^[1-9]\d*$/),
  })
  .strict();

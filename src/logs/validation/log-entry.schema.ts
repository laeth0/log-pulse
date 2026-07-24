import { z } from 'zod';

import { LogLevel } from '../entities/log.entity';

const ATTRIBUTE_VALUE_SCHEMA = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
]);

/** Runtime schema for the shape and primitive constraints of one log entry. */
export const LOG_ENTRY_SCHEMA = z.object({
  timestamp: z.iso.datetime({ offset: true }),
  level: z.enum(LogLevel),
  service: z.string().min(1),
  message: z.string().min(1),
  attributes: z.record(z.string(), ATTRIBUTE_VALUE_SCHEMA).optional(),
});

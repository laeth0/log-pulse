import { z } from 'zod';

import { LogLevel } from '../enums/log-level.enum';

export const DEFAULT_LOG_QUERY_LIMIT = 100;
export const MAX_LOG_QUERY_LIMIT = 1_000;
export const LOG_ATTRIBUTE_QUERY_PREFIX = 'attr.';
export const ISO_TIMESTAMP_SCHEMA = z.iso.datetime({ offset: true });
export const LOG_LEVEL_SCHEMA = z.enum(LogLevel);
export const NUMERIC_LIMIT_PATTERN = /^\d+$/;

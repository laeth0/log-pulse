import { BadRequestException, Injectable } from '@nestjs/common';
import { z } from 'zod';

import { LogLevel } from '../entities/log.entity';
import { LogQuery } from '../models/log-query';
import { LogQueryCursorCodec } from './log-query-cursor.codec';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1_000;
const ATTRIBUTE_PREFIX = 'attr.';
const ISO_TIMESTAMP_SCHEMA = z.iso.datetime({ offset: true });
const LOG_LEVEL_SCHEMA = z.enum(LogLevel);
const NUMERIC_LIMIT_PATTERN = /^\d+$/;

/** Converts untrusted HTTP query parameters into a validated application query. */
@Injectable()
export class LogQueryParser {
  constructor(private readonly cursorCodec: LogQueryCursorCodec) {}

  parse(rawQuery: Readonly<Record<string, unknown>>): LogQuery {
    const service = this.readOptionalString(rawQuery, 'service');
    const level = this.parseLevel(rawQuery.level);
    const since = this.parseTimestamp(rawQuery.since, 'since');
    const until = this.parseTimestamp(rawQuery.until, 'until');
    const messageQuery = this.readOptionalString(rawQuery, 'q');
    const limit = this.parseLimit(rawQuery.limit);
    const cursor = this.parseCursor(rawQuery.cursor);

    if (since && until && until.getTime() < since.getTime()) {
      this.reject('until must not be before since');
    }

    return {
      ...(service !== undefined && { service }),
      ...(level !== undefined && { level }),
      ...(since !== undefined && { since }),
      ...(until !== undefined && { until }),
      attributes: this.parseAttributes(rawQuery),
      ...(messageQuery !== undefined && { messageQuery }),
      limit,
      ...(cursor !== undefined && { cursor }),
    };
  }

  private parseLevel(input: unknown): LogLevel | undefined {
    if (input === undefined) {
      return undefined;
    }

    const parsedLevel = LOG_LEVEL_SCHEMA.safeParse(input);
    if (!parsedLevel.success) {
      const displayedLevel =
        typeof input === 'string' ? input : 'non-string value';
      this.reject(`invalid level: '${displayedLevel}'`);
    }

    return parsedLevel.data;
  }

  private parseTimestamp(input: unknown, name: string): Date | undefined {
    if (input === undefined) {
      return undefined;
    }

    const parsedTimestamp = ISO_TIMESTAMP_SCHEMA.safeParse(input);
    if (!parsedTimestamp.success) {
      this.reject(`invalid ${name} timestamp`);
    }

    return new Date(parsedTimestamp.data);
  }

  private parseLimit(input: unknown): number {
    if (input === undefined) {
      return DEFAULT_LIMIT;
    }

    if (typeof input !== 'string' || !NUMERIC_LIMIT_PATTERN.test(input)) {
      this.reject('limit must be numeric');
    }

    const requestedLimit = Number(input);
    if (requestedLimit < 1) {
      this.reject('limit must be greater than zero');
    }

    return Math.min(requestedLimit, MAX_LIMIT);
  }

  private parseCursor(input: unknown): LogQuery['cursor'] {
    if (input === undefined) {
      return undefined;
    }

    if (typeof input !== 'string') {
      this.reject('invalid cursor');
    }

    const cursor = this.cursorCodec.decode(input);
    if (!cursor) {
      this.reject('invalid cursor');
    }

    return cursor;
  }

  private parseAttributes(
    rawQuery: Readonly<Record<string, unknown>>,
  ): Readonly<Record<string, string>> {
    const attributes: Record<string, string> = {};

    for (const [name, value] of Object.entries(rawQuery)) {
      if (!name.startsWith(ATTRIBUTE_PREFIX)) {
        continue;
      }

      const attributeName = name.slice(ATTRIBUTE_PREFIX.length);
      if (attributeName.length === 0 || typeof value !== 'string') {
        this.reject(`invalid attribute filter: '${name}'`);
      }

      attributes[attributeName] = value;
    }

    return attributes;
  }

  private readOptionalString(
    rawQuery: Readonly<Record<string, unknown>>,
    name: string,
  ): string | undefined {
    const value = rawQuery[name];

    if (value === undefined) {
      return undefined;
    }

    if (typeof value !== 'string') {
      this.reject(`${name} must be a string`);
    }

    return value;
  }

  private reject(message: string): never {
    throw new BadRequestException({ error: message });
  }
}

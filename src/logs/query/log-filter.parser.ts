import { BadRequestException, Injectable } from '@nestjs/common';

import {
  ISO_TIMESTAMP_SCHEMA,
  LOG_ATTRIBUTE_QUERY_PREFIX,
  LOG_LEVEL_SCHEMA,
} from '../../common/const/log-query.const';
import type { LogLevel } from '../entities/log.entity';
import { LogFilters } from '../models/log-filters';

/** Parses filters shared by log listing and aggregation endpoints. */
@Injectable()
export class LogFilterParser {
  private readonly sharedParameterNames = new Set([
    'service',
    'level',
    'since',
    'until',
    'q',
  ]);

  assertKnownParameters(
    rawQueryParameters: Readonly<Record<string, unknown>>,
    endpointParameterNames: readonly string[],
  ): void {
    const allowedParameterNames = new Set([
      ...this.sharedParameterNames,
      ...endpointParameterNames,
    ]);

    for (const parameterName of Object.keys(rawQueryParameters)) {
      if (
        !allowedParameterNames.has(parameterName) &&
        !parameterName.startsWith(LOG_ATTRIBUTE_QUERY_PREFIX)
      ) {
        this.reject(`unknown query parameter: '${parameterName}'`);
      }
    }
  }

  parse(rawQueryParameters: Readonly<Record<string, unknown>>): LogFilters {
    const serviceName = this.readOptionalString(rawQueryParameters, 'service');
    const logLevel = this.parseLevel(rawQueryParameters.level);
    const rangeStart = this.parseTimestamp(rawQueryParameters.since, 'since');
    const rangeEnd = this.parseTimestamp(rawQueryParameters.until, 'until');
    const messageSearchTerm = this.readOptionalString(rawQueryParameters, 'q');

    if (rangeStart && rangeEnd && rangeEnd.getTime() < rangeStart.getTime()) {
      this.reject('until must not be before since');
    }

    return {
      ...(serviceName !== undefined && { service: serviceName }),
      ...(logLevel !== undefined && { level: logLevel }),
      ...(rangeStart !== undefined && { since: rangeStart }),
      ...(rangeEnd !== undefined && { until: rangeEnd }),
      attributes: this.parseAttributes(rawQueryParameters),
      ...(messageSearchTerm !== undefined && {
        messageQuery: messageSearchTerm,
      }),
    };
  }

  private parseLevel(rawLevel: unknown): LogLevel | undefined {
    if (rawLevel === undefined) {
      return undefined;
    }

    const parsedLevel = LOG_LEVEL_SCHEMA.safeParse(rawLevel);
    if (!parsedLevel.success) {
      const displayedLevel =
        typeof rawLevel === 'string' ? rawLevel : 'non-string value';
      this.reject(`invalid level: '${displayedLevel}'`);
    }

    return parsedLevel.data;
  }

  private parseTimestamp(
    rawTimestamp: unknown,
    parameterName: string,
  ): Date | undefined {
    if (rawTimestamp === undefined) {
      return undefined;
    }

    const parsedTimestamp = ISO_TIMESTAMP_SCHEMA.safeParse(rawTimestamp);
    if (!parsedTimestamp.success) {
      this.reject(`invalid ${parameterName} timestamp`);
    }

    return new Date(parsedTimestamp.data);
  }

  private parseAttributes(
    rawQueryParameters: Readonly<Record<string, unknown>>,
  ): Readonly<Record<string, string>> {
    const attributeFilters: Record<string, string> = {};

    for (const [parameterName, parameterValue] of Object.entries(
      rawQueryParameters,
    )) {
      if (!parameterName.startsWith(LOG_ATTRIBUTE_QUERY_PREFIX)) {
        continue;
      }

      const attributeName = parameterName.slice(
        LOG_ATTRIBUTE_QUERY_PREFIX.length,
      );
      if (attributeName.length === 0 || typeof parameterValue !== 'string') {
        this.reject(`invalid attribute filter: '${parameterName}'`);
      }

      attributeFilters[attributeName] = parameterValue;
    }

    return attributeFilters;
  }

  private readOptionalString(
    rawQueryParameters: Readonly<Record<string, unknown>>,
    parameterName: string,
  ): string | undefined {
    const parameterValue = rawQueryParameters[parameterName];

    if (parameterValue === undefined) {
      return undefined;
    }

    if (typeof parameterValue !== 'string') {
      this.reject(`${parameterName} must be a string`);
    }

    return parameterValue;
  }

  private reject(message: string): never {
    throw new BadRequestException({ error: message });
  }
}

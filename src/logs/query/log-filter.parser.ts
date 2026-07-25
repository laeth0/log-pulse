import { BadRequestException, Injectable } from '@nestjs/common';

import {
  ISO_TIMESTAMP_SCHEMA,
  LOG_ATTRIBUTE_QUERY_PREFIX,
  LOG_LEVEL_SCHEMA,
} from '../../common/const/log-query.const';
import type { LogLevel } from '../../common/enums/log-level.enum';
import type { LogAttributeFilter, LogFilters } from '../models/log-filters';

const SHARED_PARAMETER_NAMES: readonly string[] = [
  'service',
  'level',
  'since',
  'until',
  'q',
];

/** Parses filters shared by log listing and aggregation endpoints. */
@Injectable()
export class LogFilterParser {
  assertKnownParameters(
    rawQueryParameters: Readonly<Record<string, unknown>>,
    endpointParameterNames: readonly string[],
  ): void {
    const allowedParameterNames = [
      ...SHARED_PARAMETER_NAMES,
      ...endpointParameterNames,
    ];

    for (const parameterName of Object.keys(rawQueryParameters)) {
      if (
        !allowedParameterNames.includes(parameterName) &&
        !parameterName.startsWith(LOG_ATTRIBUTE_QUERY_PREFIX)
      ) {
        throw new BadRequestException({
          error: `unknown query parameter: '${parameterName}'`,
        });
      }
    }
  }

  parse(rawQueryParameters: Readonly<Record<string, unknown>>): LogFilters {
    const service = this.readOptionalString(rawQueryParameters, 'service');
    const level = this.parseLevel(rawQueryParameters.level);
    const since = this.parseTimestamp(rawQueryParameters.since, 'since');
    const until = this.parseTimestamp(rawQueryParameters.until, 'until');
    const messageQuery = this.readOptionalString(rawQueryParameters, 'q');

    if (messageQuery === '') {
      throw new BadRequestException({ error: 'q must not be empty' });
    }

    if (since && until && until < since) {
      throw new BadRequestException({
        error: 'until must not be before since',
      });
    }

    return {
      service,
      level,
      since,
      until,
      attributes: this.parseAttributes(rawQueryParameters),
      messageQuery,
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
      throw new BadRequestException({
        error: `invalid level: '${displayedLevel}'`,
      });
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
      throw new BadRequestException({
        error: `invalid ${parameterName} timestamp`,
      });
    }

    return new Date(parsedTimestamp.data);
  }

  private parseAttributes(
    rawQueryParameters: Readonly<Record<string, unknown>>,
  ): readonly LogAttributeFilter[] {
    const attributeFilters: LogAttributeFilter[] = [];

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
        throw new BadRequestException({
          error: `invalid attribute filter: '${parameterName}'`,
        });
      }

      attributeFilters.push([attributeName, parameterValue]);
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
      throw new BadRequestException({
        error: `${parameterName} must be a string`,
      });
    }

    return parameterValue;
  }
}

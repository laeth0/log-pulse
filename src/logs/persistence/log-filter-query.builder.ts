import { Injectable } from '@nestjs/common';
import type { SelectQueryBuilder } from 'typeorm';

import type { Log } from '../entities/log.entity';
import type { LogFilters } from '../models/log-filters';

/** Applies shared, fully parameterized log filters to persistence queries. */
@Injectable()
export class LogFilterQueryBuilder {
  apply(queryBuilder: SelectQueryBuilder<Log>, filters: LogFilters): void {
    if (filters.service !== undefined) {
      queryBuilder.andWhere(
        'md5(log.service) = md5(:service) AND log.service = :service',
        { service: filters.service },
      );
    }

    if (filters.level !== undefined) {
      queryBuilder.andWhere('log.level = :level', {
        level: filters.level,
      });
    }

    if (filters.since !== undefined) {
      queryBuilder.andWhere('log.timestamp >= :since', {
        since: filters.since,
      });
    }

    if (filters.until !== undefined) {
      queryBuilder.andWhere('log.timestamp < :until', {
        until: filters.until,
      });
    }

    if (filters.messageQuery !== undefined) {
      queryBuilder.andWhere("log.message ILIKE :messageQuery ESCAPE '\\'", {
        messageQuery: `%${this.escapeLikePattern(filters.messageQuery)}%`,
      });
    }

    filters.attributes.forEach(
      ([attributeName, attributeValue], attributeFilterIndex): void => {
        queryBuilder.andWhere(
          `log.attributes ->> CAST(:attributeName${attributeFilterIndex} AS text) = CAST(:attributeValue${attributeFilterIndex} AS text)`,
          {
            [`attributeName${attributeFilterIndex}`]: attributeName,
            [`attributeValue${attributeFilterIndex}`]: attributeValue,
          },
        );
      },
    );
  }

  private escapeLikePattern(searchText: string): string {
    return searchText.replace(/[\\%_]/g, '\\$&');
  }
}

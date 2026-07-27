import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { Clock } from '../common/time/clock';

export type HealthStatus = Readonly<{
  status: 'ok';
  database: 'connected';
  timestamp: string;
}>;

@Injectable()
export class HealthService {
  constructor(
    private readonly clock: Clock,
    private readonly dataSource: DataSource,
  ) {}

  async getHealth(): Promise<HealthStatus> {
    await this.dataSource.query('SELECT 1');

    if (await this.dataSource.showMigrations()) {
      throw new ServiceUnavailableException('Database migrations are pending');
    }

    return {
      status: 'ok',
      database: 'connected',
      timestamp: this.clock.now().toISOString(),
    };
  }
}

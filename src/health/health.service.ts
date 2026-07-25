import { Injectable } from '@nestjs/common';

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
  ) {}

  async getHealth(): Promise<HealthStatus> {
    return {
      status: 'ok',
      database: 'connected',
      timestamp: this.clock.now().toISOString(),
    };
  }
}

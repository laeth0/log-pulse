import { Injectable } from '@nestjs/common';

import { Clock } from '../common/time/clock';
import { ReadinessService } from './readiness.service';

export type HealthStatus = Readonly<{
  status: 'ok';
  database: 'connected';
  timestamp: string;
}>;

@Injectable()
export class HealthService {
  constructor(
    private readonly readinessService: ReadinessService,
    private readonly clock: Clock,
  ) {}

  async getHealth(): Promise<HealthStatus> {
    await this.readinessService.assertReady();

    return {
      status: 'ok',
      database: 'connected',
      timestamp: this.clock.now().toISOString(),
    };
  }
}

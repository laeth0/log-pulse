import { Module } from '@nestjs/common';

import { Clock } from '../common/time/clock';
import { SystemClock } from '../common/time/system-clock';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { ReadinessService } from './readiness.service';

@Module({
  controllers: [HealthController],
  providers: [
    HealthService,
    ReadinessService,
    { provide: Clock, useClass: SystemClock },
  ],
  exports: [ReadinessService],
})
export class HealthModule {}

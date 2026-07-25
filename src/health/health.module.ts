import { Module } from '@nestjs/common';

import { Clock } from '../common/time/clock';
import { SystemClock } from '../common/time/system-clock';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  controllers: [HealthController],
  providers: [
    HealthService,
    { provide: Clock, useClass: SystemClock },
  ],
})
export class HealthModule {}

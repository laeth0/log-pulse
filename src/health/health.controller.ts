import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';

import { HealthService, type HealthStatus } from './health.service';

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('health')
  @HttpCode(HttpStatus.OK)
  getHealth(): Promise<HealthStatus> {
    return this.healthService.getHealth();
  }
}

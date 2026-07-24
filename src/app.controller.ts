import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { AppService, HealthStatus } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * GET /health
   * Required by the load generator — returns 200 once the database is
   * connected and migrations have been applied.
   */
  @Get('health')
  @HttpCode(HttpStatus.OK)
  getHealth(): Promise<HealthStatus> {
    return this.appService.getHealth();
  }
}

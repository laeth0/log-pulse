import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class ReadinessService {
  private readonly logger = new Logger(ReadinessService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async assertReady(): Promise<void> {
    if (!this.dataSource.isInitialized) {
      throw new ServiceUnavailableException('Database is not initialized');
    }

    try {
      await this.dataSource.query('SELECT 1');
      if (await this.dataSource.showMigrations()) {
        throw new ServiceUnavailableException(
          'Database migrations are pending',
        );
      }
    } catch (error: unknown) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      this.logger.warn(
        `Database readiness check failed: ${
          error instanceof Error ? error.message : 'unknown database error'
        }`,
      );
      throw new ServiceUnavailableException('Database is not ready', {
        cause: error,
      });
    }
  }
}

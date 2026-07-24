import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // Load .env and make ConfigService available everywhere
    ConfigModule.forRoot({ isGlobal: true }),

    // Database connection — reads from environment variables
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host: cfg.get<string>('DB_HOST', 'localhost'),
        port: cfg.get<number>('DB_PORT', 5432),
        username: cfg.get<string>('DB_USER', 'postgres'),
        password: cfg.get<string>('DB_PASS', ''),
        database: cfg.get<string>('DB_NAME', 'log_pulse'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        migrationsTableName: 'typeorm_migrations',
        migrationsRun: true,   // run pending migrations automatically on startup
        synchronize: false,
        ssl:
          cfg.get<string>('DB_SSL') === 'true'
            ? { rejectUnauthorized: false }
            : false,
        logging: cfg.get<string>('NODE_ENV') === 'development',
      }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

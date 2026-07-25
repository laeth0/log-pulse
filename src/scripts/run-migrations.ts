import 'reflect-metadata';

import { AppDataSource } from '../config/data-source';

async function runMigrations(): Promise<void> {
  try {
    await AppDataSource.initialize();
    const migrations = await AppDataSource.runMigrations({
      transaction: 'all',
    });
    process.stdout.write(`Applied ${migrations.length} migration(s).\n`);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

void runMigrations().catch((error: unknown) => {
  process.stderr.write(
    `Migration failed: ${error instanceof Error ? error.message : 'unknown error'}\n`,
  );
  process.exitCode = 1;
});

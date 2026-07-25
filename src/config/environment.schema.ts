import { z } from 'zod';

const positiveInteger = (defaultValue: number, maximum?: number) => {
  const schema = z.coerce.number().int().positive();
  return z.preprocess(
    (value) => (value === undefined || value === '' ? defaultValue : value),
    maximum === undefined ? schema : schema.max(maximum),
  );
};

const booleanString = (defaultValue: boolean) =>
  z
    .preprocess(
      (value) => {
        if (value === undefined || value === '') {
          return String(defaultValue);
        }

        if (typeof value === 'boolean') {
          return String(value);
        }

        return typeof value === 'string' ? value.toLowerCase() : value;
      },
      z.enum(['true', 'false']),
    )
    .transform((value) => value === 'true');

export const ENVIRONMENT_SCHEMA = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: positiveInteger(8080).pipe(z.literal(8080)),
    HTTP_BODY_LIMIT_BYTES: positiveInteger(52_428_800, 1_073_741_824),
    DB_HOST: z.string().min(1).default('localhost'),
    DB_PORT: positiveInteger(5432, 65_535),
    DB_USER: z.string().min(1).default('postgres'),
    DB_PASS: z.string().default(''),
    DB_NAME: z
      .string()
      .regex(
        /^[A-Za-z_][A-Za-z0-9_]*$/,
        'must be a simple PostgreSQL identifier',
      )
      .default('log_pulse'),
    DB_SSL: booleanString(false),
    DB_POOL_MAX: positiveInteger(20, 1_000),
    DB_CONNECTION_TIMEOUT_MS: positiveInteger(5_000),
    DB_IDLE_TIMEOUT_MS: positiveInteger(30_000),
    LOG_INGEST_CHUNK_SIZE: positiveInteger(1_000, 10_000),
    LOG_RETENTION_ENABLED: booleanString(true),
    LOG_RETENTION_DAYS: positiveInteger(30, 3_650),
    LOG_RETENTION_BATCH_SIZE: positiveInteger(5_000, 10_000),
    LOG_RETENTION_MAX_BATCHES: positiveInteger(400, 10_000),
    LOG_RETENTION_MAX_RUN_MS: positiveInteger(3_300_000, 3_599_999),
    ALLOW_DATABASE_DROP: booleanString(false),
    ALLOW_PERFORMANCE_RESET: booleanString(false),
  })
  .readonly();

export type Environment = z.infer<typeof ENVIRONMENT_SCHEMA>;

export function parseEnvironment(
  rawEnvironment: NodeJS.ProcessEnv,
): Environment {
  const parseResult = ENVIRONMENT_SCHEMA.safeParse(rawEnvironment);

  if (!parseResult.success) {
    const issues = parseResult.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }

  return parseResult.data;
}

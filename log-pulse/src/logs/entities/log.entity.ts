import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm';

/** Allowed log severity levels as defined by the API contract. */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Flat attribute bag: values are strings, numbers, or booleans.
 * No nested objects are allowed (validated at the DTO layer).
 */
export type LogAttributes = Record<string, string | number | boolean>;

/**
 * Log entity — represents one structured log entry stored in PostgreSQL.
 *
 * Schema decisions:
 *  - `timestamp` is a plain timestamptz column (not auto-generated) so that
 *    the ingestion layer stores the client-supplied time, not the DB insert time.
 *  - `attributes` is stored as `jsonb` so PostgreSQL can index and filter
 *    individual keys with GIN or expression indexes without a separate table.
 *  - Composite indexes on (service, timestamp) and (level, timestamp) support
 *    the most common query patterns while keeping write amplification low.
 *  - `id` uses BIGINT GENERATED ALWAYS (via `PrimaryGeneratedColumn('increment')`)
 *    rather than UUID to keep the primary key narrow and the clustered index tight,
 *    which matters at million-plus row counts.
 */
@Entity('logs')
@Index('idx_logs_service_timestamp', ['service', 'timestamp'])
@Index('idx_logs_level_timestamp', ['level', 'timestamp'])
@Index('idx_logs_timestamp', ['timestamp'])
export class Log {
  /**
   * Auto-incrementing surrogate primary key.
   * Used as the cursor token base for keyset pagination.
   */
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  /**
   * Client-supplied event time (required, ISO 8601).
   * Stored as `timestamptz` so PostgreSQL handles time-zone offsets correctly.
   * Rejected at ingest if unparseable or more than 5 minutes in the future.
   */
  @Column({ type: 'timestamptz', nullable: false })
  timestamp: Date;

  /**
   * Severity level — one of debug / info / warn / error.
   * Using a native enum column lets PostgreSQL enforce the constraint at the
   * DB level and keeps the column storage to a few bytes.
   */
  @Column({
    type: 'enum',
    enum: LogLevel,
    nullable: false,
  })
  level: LogLevel;

  /**
   * Name of the originating service (non-empty string, required).
   * Indexed via the composite index on (service, timestamp).
   */
  @Column({ type: 'varchar', length: 255, nullable: false })
  service: string;

  /**
   * Human-readable log message (non-empty string, required).
   * Stored as `text` (no length cap) to accommodate long messages.
   * Substring searches (`q` param) run a `ILIKE '%term%'` scan; if full-text
   * performance becomes critical, add a `tsvector` generated column + GIN index.
   */
  @Column({ type: 'text', nullable: false })
  message: string;

  /**
   * Arbitrary flat key/value metadata (optional).
   * Stored as PostgreSQL `jsonb` — binary JSON that supports GIN indexing and
   * expression-based filtering (e.g. `attributes->>'user_id' = '42'`).
   * Default is an empty object so queries never need to handle NULL.
   */
  @Column({ type: 'jsonb', nullable: false, default: {} })
  attributes: LogAttributes;

  /**
   * Wall-clock time the row was inserted into the database.
   * Useful for debugging ingestion latency; not exposed in the public API.
   */
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}

import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LogLevel } from '../../common/enums/log-level.enum';

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
 *  - Secondary indexes are migration-owned and must be justified by measured
 *    production query patterns.
 *  - `id` is a PostgreSQL bigint identity represented as a decimal string in
 *    TypeScript so values never lose integer precision.
 */
@Entity('logs')
@Check('chk_logs_service_non_empty', 'char_length("service") > 0')
@Check('chk_logs_message_non_empty', 'char_length("message") > 0')
@Check(
  'chk_logs_attributes_flat_scalars',
  'log_attributes_are_flat_scalars("attributes")',
)
export class Log {
  /**
   * PostgreSQL bigint identity, returned by the pg driver as a decimal string.
   */
  @PrimaryGeneratedColumn('identity', {
    type: 'bigint',
    generatedIdentity: 'BY DEFAULT',
    primaryKeyConstraintName: 'pk_logs',
  })
  id!: string;

  /**
   * Client-supplied event time (required, ISO 8601).
   * Stored as `timestamptz` so PostgreSQL handles time-zone offsets correctly.
   * Rejected at ingest if unparseable or more than 5 minutes in the future.
   */
  @Column({ type: 'timestamptz', nullable: false })
  timestamp!: Date;

  /**
   * Severity level — one of debug / info / warn / error.
   * Using a native enum column lets PostgreSQL enforce the constraint at the
   * DB level and keeps the column storage to a few bytes.
   */
  @Column({
    type: 'enum',
    enum: LogLevel,
    enumName: 'logs_level_enum',
    nullable: false,
  })
  level!: LogLevel;

  /**
   * Name of the originating service (non-empty string, required).
   * Indexed via the composite index on (service, timestamp).
   */
  @Column({ type: 'text', nullable: false })
  service!: string;

  /**
   * Human-readable log message (non-empty string, required).
   * Stored as `text` (no length cap) to accommodate long messages.
   * Substring searches use parameterized ILIKE and a trigram GIN index.
   */
  @Column({ type: 'text', nullable: false })
  message!: string;

  /**
   * Arbitrary flat key/value metadata (optional).
   * Stored as PostgreSQL `jsonb` — binary JSON that supports GIN indexing and
   * expression-based filtering (e.g. `attributes->>'user_id' = '42'`).
   * Default is an empty object so queries never need to handle NULL.
   */
  @Column({
    type: 'jsonb',
    nullable: false,
    default: {},
  })
  attributes!: LogAttributes;

  /**
   * Internal generated projection used for type-insensitive string equality.
   * It is never selected or supplied by application code.
   */
  @Column({
    type: 'jsonb',
    name: 'attributes_text',
    asExpression: 'log_attributes_to_text("attributes")',
    generatedType: 'STORED',
    select: false,
    insert: false,
    update: false,
  })
  attributesText!: Readonly<Record<string, string>>;

  /**
   * Wall-clock time the row was inserted into the database.
   * Useful for debugging ingestion latency; not exposed in the public API.
   */
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}

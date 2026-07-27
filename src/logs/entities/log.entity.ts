import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LogLevel } from '../../common/enums/log-level.enum';

export type LogAttributes = Record<string, string | number | boolean>;

@Entity('logs')
@Index('idx_logs_timestamp_id', ['timestamp', 'id'])
@Index('idx_logs_service_timestamp_id', ['service', 'timestamp', 'id'])
@Index('idx_logs_level_timestamp_id', ['level', 'timestamp', 'id'])
@Check('chk_logs_service_non_empty', 'char_length("service") > 0')
@Check('chk_logs_message_non_empty', 'char_length("message") > 0')
export class Log {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'pk_logs',
  })
  id!: string;

  @Column({ type: 'timestamptz', nullable: false })
  timestamp!: Date;

  @Column({
    type: 'enum',
    enum: LogLevel,
    enumName: 'logs_level_enum',
    nullable: false,
  })
  level!: LogLevel;

  @Column({ type: 'text', nullable: false })
  service!: string;

  @Column({ type: 'text', nullable: false })
  message!: string;

  @Column({
    type: 'jsonb',
    nullable: false,
    default: {},
  })
  attributes!: LogAttributes;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}

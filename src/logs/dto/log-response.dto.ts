import { ApiProperty } from '@nestjs/swagger';

import { LogLevel } from '../../common/enums/log-level.enum';
import type { LogAttributes } from '../entities/log.entity';

/** Public representation of a stored log. */
export class LogResponseDto {
  @ApiProperty({ example: '42' })
  readonly id!: string;

  @ApiProperty({ example: '2026-07-20T14:32:01.123Z' })
  readonly timestamp!: string;

  @ApiProperty({ enum: LogLevel, example: LogLevel.ERROR })
  readonly level!: LogLevel;

  @ApiProperty({ example: 'checkout' })
  readonly service!: string;

  @ApiProperty({ example: 'payment declined' })
  readonly message!: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: {
      oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }],
    },
  })
  readonly attributes!: LogAttributes;
}

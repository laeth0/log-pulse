import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';

/** Request body for batch log ingestion. */
export class IngestLogsDto {
  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  @IsArray()
  readonly logs!: readonly unknown[];
}

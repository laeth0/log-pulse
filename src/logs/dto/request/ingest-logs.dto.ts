import { ApiProperty } from '@nestjs/swagger';

/** HTTP request body for batch log ingestion. */
export class IngestLogsDto {
  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  readonly logs!: readonly unknown[];
}

import { ApiProperty } from '@nestjs/swagger';

import { LogResponseDto } from './log-response.dto';

/** Cursor-paginated log query response. */
export class QueryLogsResponseDto {
  @ApiProperty({ type: [LogResponseDto] })
  readonly logs!: readonly LogResponseDto[];

  @ApiProperty({
    example:
      'eyJ0aW1lc3RhbXAiOiIyMDI2LTA3LTIwVDE0OjMyOjAxLjEyM1oiLCJpZCI6IjQyIn0',
    nullable: true,
  })
  readonly next_cursor!: string | null;
}

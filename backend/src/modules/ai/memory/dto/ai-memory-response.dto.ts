import { ApiProperty } from '@nestjs/swagger';
import { AIMemoryCategory, AIMemoryStatus } from '../memory.enums.js';

export class AIMemoryResponseDto {
  @ApiProperty({
    description: 'Internal unique memory UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  public id!: string;

  @ApiProperty({
    description: 'Public non-sequential memory ID (e.g. MEM-XXXXXXXX)',
    example: 'MEM-8A4C2E9F',
  })
  public publicMemoryId!: string;

  @ApiProperty({
    description: 'Category of memory',
    enum: AIMemoryCategory,
    example: AIMemoryCategory.PREFERENCE,
  })
  public category!: AIMemoryCategory;

  @ApiProperty({
    description: 'Memory key',
    example: 'preferred_tone',
  })
  public key!: string;

  @ApiProperty({
    description: 'Memory value',
    example: 'Concise and encouraging summaries',
  })
  public value!: string;

  @ApiProperty({
    description: 'Confidence score of the memory (0.0 - 1.0)',
    example: 1.0,
  })
  public confidence!: number;

  @ApiProperty({
    description: 'Memory status',
    enum: AIMemoryStatus,
    example: AIMemoryStatus.ACTIVE,
  })
  public status!: AIMemoryStatus;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2026-09-29T21:00:00.000Z',
  })
  public createdAt!: string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2026-09-29T21:00:00.000Z',
  })
  public updatedAt!: string;
}

import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AIMemoryCategory } from '../memory.enums.js';

export class CreateAIMemoryDto {
  @ApiProperty({
    description: 'Category of long-term non-clinical memory',
    enum: AIMemoryCategory,
    example: AIMemoryCategory.PREFERENCE,
  })
  @IsEnum(AIMemoryCategory, {
    message:
      'category must be one of PREFERENCE, COMMUNICATION_STYLE, WELLNESS_GOAL, PERSONALIZATION',
  })
  public category!: AIMemoryCategory;

  @ApiProperty({
    description: 'Key or identifier of the preference/goal',
    example: 'preferred_tone',
    maxLength: 128,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(128, { message: 'key cannot exceed 128 characters' })
  public key!: string;

  @ApiProperty({
    description: 'User-approved value of the preference',
    example: 'Concise and encouraging summaries',
    maxLength: 500,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500, { message: 'value cannot exceed 500 characters' })
  public value!: string;
}

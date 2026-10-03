import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RetrieveEvidenceDto {
  @ApiProperty({
    description: 'Wellness or clinical question query to retrieve guidelines for',
    example: 'guidelines for adult blood pressure management',
  })
  @IsString()
  @MinLength(1)
  public query!: string;

  @ApiPropertyOptional({
    description: 'Maximum number of evidence chunks to retrieve',
    example: 3,
    default: 3,
  })
  @IsOptional()
  public limit?: number;
}

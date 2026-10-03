import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SpecialtyResponseDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  id!: string;

  @ApiProperty({ example: 'CARDIO' })
  code!: string;

  @ApiProperty({ example: 'Cardiology' })
  name!: string;

  @ApiPropertyOptional({
    example: 'Disorders of the heart and cardiovascular system',
  })
  description?: string | null;

  @ApiProperty({ example: true })
  isActive!: boolean;
}

export class LanguageResponseDto {
  @ApiProperty({ example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22' })
  id!: string;

  @ApiProperty({ example: 'en' })
  code!: string;

  @ApiProperty({ example: 'English' })
  name!: string;
}

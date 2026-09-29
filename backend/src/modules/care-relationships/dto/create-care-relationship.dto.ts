import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCareRelationshipDto {
  @ApiProperty({
    description: 'Public doctor identifier (e.g. DOC-90218471) or doctor ID',
    example: 'DOC-90218471',
  })
  @IsString()
  @IsNotEmpty({ message: 'doctorId or publicDoctorId is required' })
  public doctorId!: string;

  @ApiPropertyOptional({
    description: 'Optional clinical context or initiation notes for the relationship',
    example: 'Primary care relationship established for cardiac health follow-up',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  public notes?: string;
}

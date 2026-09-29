import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CareRelationshipStatus } from '../enums/care-relationship-status.enum.js';

export class CareRelationshipResponseDto {
  @ApiProperty({ example: 'b5a03423-f32a-466d-a169-26b2b736780c' })
  public id!: string;

  @ApiProperty({ example: 'PAT-90218471' })
  public publicPatientId!: string;

  @ApiProperty({ example: 'DOC-90218471' })
  public publicDoctorId!: string;

  @ApiProperty({ example: 'Dr. Gregory House' })
  public doctorDisplayName!: string;

  @ApiProperty({ enum: CareRelationshipStatus, example: CareRelationshipStatus.ACTIVE })
  public status!: CareRelationshipStatus;

  @ApiPropertyOptional({ example: '2026-09-29T10:00:00.000Z' })
  public establishedAt?: string | null;

  @ApiPropertyOptional({ example: null })
  public terminatedAt?: string | null;

  @ApiPropertyOptional({ example: 'Initiated for cardiology care' })
  public notes?: string | null;

  @ApiProperty({ example: '2026-09-29T10:00:00.000Z' })
  public createdAt!: string;

  @ApiProperty({ example: '2026-09-29T10:00:00.000Z' })
  public updatedAt!: string;
}

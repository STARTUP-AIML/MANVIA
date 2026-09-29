import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConsentScope } from '../enums/consent-scope.enum.js';
import { ConsentStatus } from '../enums/consent-status.enum.js';

export class ConsentResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' })
  public id!: string;

  @ApiProperty({ example: 'PAT-90218471' })
  public publicPatientId!: string;

  @ApiProperty({ example: 'DOC-90218471' })
  public publicDoctorId!: string;

  @ApiProperty({ example: 'Dr. Gregory House' })
  public doctorDisplayName!: string;

  @ApiPropertyOptional({ example: 'rel-12345' })
  public careRelationshipId?: string | null;

  @ApiProperty({ enum: ConsentScope, example: ConsentScope.HEALTH_RECORDS })
  public scope!: ConsentScope;

  @ApiProperty({ enum: ConsentStatus, example: ConsentStatus.ACTIVE })
  public status!: ConsentStatus;

  @ApiPropertyOptional({ example: 'Medical assessment' })
  public purpose?: string | null;

  @ApiProperty({ example: true })
  public isCurrentlyActive!: boolean;

  @ApiProperty({ example: '2026-09-29T10:00:00.000Z' })
  public grantedAt!: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  public expiresAt?: string | null;

  @ApiPropertyOptional({ example: null })
  public revokedAt?: string | null;

  @ApiPropertyOptional({ example: null })
  public revocationReason?: string | null;

  @ApiProperty({ example: '2026-09-29T10:00:00.000Z' })
  public createdAt!: string;

  @ApiProperty({ example: '2026-09-29T10:00:00.000Z' })
  public updatedAt!: string;
}

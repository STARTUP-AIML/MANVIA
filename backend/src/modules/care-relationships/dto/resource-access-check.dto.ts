import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ConsentScope } from '../enums/consent-scope.enum.js';

export class ResourceAccessCheckQueryDto {
  @ApiProperty({
    description: 'Patient identifier (public ID e.g. PAT-90218471 or internal UUID)',
    example: 'PAT-90218471',
  })
  @IsString()
  @IsNotEmpty()
  public patientId!: string;

  @ApiProperty({
    description: 'Resource scope being evaluated for access',
    enum: ConsentScope,
    example: ConsentScope.HEALTH_RECORDS,
  })
  @IsEnum(ConsentScope)
  public resourceType!: ConsentScope;
}

export class ResourceAccessDecisionDto {
  @ApiProperty({ example: true })
  public allowed!: boolean;

  @ApiPropertyOptional({
    example: 'Access granted via active care relationship and patient consent',
  })
  public reason?: string;

  @ApiPropertyOptional({ example: 'rel-12345' })
  public careRelationshipId?: string;

  @ApiPropertyOptional({ example: 'consent-12345' })
  public consentId?: string;
}

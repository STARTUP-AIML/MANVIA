import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConsentAction } from '../enums/consent-action.enum.js';

export class ConsentHistoryResponseDto {
  @ApiProperty({ example: 'hist-12345' })
  public id!: string;

  @ApiProperty({ example: 'consent-12345' })
  public consentId!: string;

  @ApiProperty({ enum: ConsentAction, example: ConsentAction.GRANTED })
  public action!: ConsentAction;

  @ApiProperty({ example: 'usr-patient-1' })
  public actorId!: string;

  @ApiProperty({ example: 'PATIENT' })
  public actorRole!: string;

  @ApiPropertyOptional({ example: 'Initial patient consent grant' })
  public reason?: string | null;

  @ApiPropertyOptional({ example: null })
  public metadata?: string | null;

  @ApiProperty({ example: '2026-09-29T10:00:00.000Z' })
  public createdAt!: string;
}

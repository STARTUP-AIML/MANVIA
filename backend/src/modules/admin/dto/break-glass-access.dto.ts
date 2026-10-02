import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsNotEmpty, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class BreakGlassAccessDto {
  @ApiProperty({
    description:
      'Target patient UUID whose clinical record is being accessed under emergency incident governance',
    example: 'a0000000-0000-0000-0000-000000000001',
  })
  @IsNotEmpty()
  @IsUUID()
  public patientId!: string;

  @ApiProperty({
    description: 'Mandatory clinical safety incident or IT governance ticket identifier',
    example: 'INC-2026-09384-CLINICAL',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  @MaxLength(64)
  public incidentTicketId!: string;

  @ApiProperty({
    description:
      'Detailed formal clinical justification for accessing confidential patient health data (minimum 20 characters)',
    example:
      'Investigating critical medication interaction alert reported during acute clinical escalation.',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(20)
  @MaxLength(1000)
  public justification!: string;

  @ApiProperty({
    description:
      'Explicit acknowledgment that this emergency break-glass action creates an immutable, high-severity clinical audit record',
    example: true,
  })
  @IsNotEmpty()
  @Equals(true, {
    message: 'You must explicitly acknowledge the emergency break-glass audit terms',
  })
  public acknowledgedTerms!: boolean;
}

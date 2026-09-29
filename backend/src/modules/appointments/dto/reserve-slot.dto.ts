import { IsInt, IsISO8601, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReserveSlotDto {
  @ApiProperty({
    description: 'Target doctor UUID or public identifier (DOC-XXXXXXXX)',
    example: 'DOC-7492ABCD',
  })
  @IsString({ message: 'doctorId must be a string' })
  @IsNotEmpty({ message: 'doctorId cannot be empty' })
  public doctorId!: string;

  @ApiProperty({
    description: 'ID of the selected ConsultationOffer',
    example: 'b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e',
  })
  @IsString({ message: 'consultationOfferId must be a string' })
  @IsNotEmpty({ message: 'consultationOfferId cannot be empty' })
  public consultationOfferId!: string;

  @ApiProperty({
    description: 'Start timestamp of the desired slot (ISO 8601 string)',
    example: '2026-10-05T14:00:00.000Z',
  })
  @IsISO8601({}, { message: 'startAt must be a valid ISO 8601 timestamp string' })
  public startAt!: string;

  @ApiPropertyOptional({
    description: 'Temporary hold duration in minutes (default 15 minutes, maximum 30 minutes)',
    minimum: 5,
    maximum: 30,
    example: 15,
  })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(30)
  public holdDurationMinutes?: number;
}

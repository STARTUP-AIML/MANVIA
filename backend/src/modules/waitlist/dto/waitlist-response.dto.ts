import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WaitlistStatus } from '../enums/waitlist-status.enum.js';

export class WaitlistEntryResponseDto {
  @ApiProperty({ example: 'a0000000-0000-0000-0000-000000000001' })
  public id!: string;

  @ApiProperty({ example: 'WTL-4M8P2N9K' })
  public publicWaitlistId!: string;

  @ApiProperty({ example: 'PAT-48291048' })
  public publicPatientId!: string;

  @ApiProperty({ example: 'DOC-55443322' })
  public publicDoctorId!: string;

  @ApiPropertyOptional({ example: 'Dr. John Watson' })
  public doctorDisplayName?: string | undefined;

  @ApiPropertyOptional({ example: 'b0000000-0000-0000-0000-000000000002' })
  public consultationOfferId!: string | null;

  @ApiProperty({ example: 0 })
  public priority!: number;

  @ApiProperty({ enum: WaitlistStatus, example: WaitlistStatus.ACTIVE })
  public status!: WaitlistStatus;

  @ApiPropertyOptional({ example: '2026-10-05T08:00:00.000Z' })
  public preferredStartDate!: string | null;

  @ApiPropertyOptional({ example: '2026-10-12T18:00:00.000Z' })
  public preferredEndDate!: string | null;

  @ApiPropertyOptional({ example: 'Prefer mornings after 9 AM' })
  public notes!: string | null;

  @ApiProperty({ example: '2026-10-01T10:00:00.000Z' })
  public joinedAt!: string;

  @ApiPropertyOptional({ example: '2026-10-01T11:00:00.000Z' })
  public offeredAt!: string | null;

  @ApiPropertyOptional({ example: '2026-10-01T11:30:00.000Z' })
  public offerExpiresAt!: string | null;

  @ApiPropertyOptional({ example: '2026-10-01T11:15:00.000Z' })
  public acceptedAt!: string | null;

  @ApiPropertyOptional({ example: null })
  public declinedAt!: string | null;

  @ApiPropertyOptional({ example: '2026-10-01T11:15:00.000Z' })
  public fulfilledAt!: string | null;

  @ApiPropertyOptional({ example: null })
  public cancelledAt!: string | null;

  @ApiPropertyOptional({ example: 'APT-3R9N6TLH' })
  public offeredAppointmentPublicId!: string | null;

  @ApiPropertyOptional({ example: 1 })
  public queuePosition?: number | undefined;

  @ApiProperty({ example: '2026-10-01T10:00:00.000Z' })
  public createdAt!: string;

  @ApiProperty({ example: '2026-10-01T10:00:00.000Z' })
  public updatedAt!: string;
}

export class PaginatedWaitlistResponseDto {
  @ApiProperty({ type: [WaitlistEntryResponseDto] })
  public data!: WaitlistEntryResponseDto[];

  @ApiProperty({ example: 1 })
  public total!: number;

  @ApiProperty({ example: 1 })
  public page!: number;

  @ApiProperty({ example: 20 })
  public limit!: number;

  @ApiProperty({ example: 1 })
  public totalPages!: number;
}

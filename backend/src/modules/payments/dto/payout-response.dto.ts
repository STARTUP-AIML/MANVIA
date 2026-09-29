import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { DoctorPayoutEntity } from '../entities/doctor-payout.entity.js';

export class DoctorPayoutResponseDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public publicPayoutId!: string;

  @ApiProperty()
  public doctorId!: string;

  @ApiProperty()
  public appointmentId!: string;

  @ApiProperty()
  public paymentId!: string;

  @ApiProperty()
  public grossAmount!: string;

  @ApiProperty()
  public platformFee!: string;

  @ApiProperty()
  public taxWithheld!: string;

  @ApiProperty()
  public providerFee!: string;

  @ApiProperty()
  public netAmount!: string;

  @ApiProperty()
  public currency!: string;

  @ApiProperty()
  public status!: string;

  @ApiPropertyOptional()
  public provider?: string | null;

  @ApiPropertyOptional()
  public providerPayoutId?: string | null;

  @ApiPropertyOptional()
  public eligibleAt?: string | null;

  @ApiPropertyOptional()
  public scheduledAt?: string | null;

  @ApiPropertyOptional()
  public processedAt?: string | null;

  @ApiPropertyOptional()
  public failedAt?: string | null;

  @ApiPropertyOptional()
  public failureReason?: string | null;

  @ApiProperty()
  public createdAt!: string;

  public static fromEntity(entity: DoctorPayoutEntity): DoctorPayoutResponseDto {
    const dto = new DoctorPayoutResponseDto();
    dto.id = entity.id;
    dto.publicPayoutId = entity.publicPayoutId;
    dto.doctorId = entity.doctorId;
    dto.appointmentId = entity.appointmentId;
    dto.paymentId = entity.paymentId;
    dto.grossAmount = entity.grossAmount;
    dto.platformFee = entity.platformFee;
    dto.taxWithheld = entity.taxWithheld;
    dto.providerFee = entity.providerFee;
    dto.netAmount = entity.netAmount;
    dto.currency = entity.currency;
    dto.status = entity.status;
    dto.provider = entity.provider ?? null;
    dto.providerPayoutId = entity.providerPayoutId ?? null;
    dto.eligibleAt = entity.eligibleAt ? entity.eligibleAt.toISOString() : null;
    dto.scheduledAt = entity.scheduledAt ? entity.scheduledAt.toISOString() : null;
    dto.processedAt = entity.processedAt ? entity.processedAt.toISOString() : null;
    dto.failedAt = entity.failedAt ? entity.failedAt.toISOString() : null;
    dto.failureReason = entity.failureReason ?? null;
    dto.createdAt = entity.createdAt.toISOString();
    return dto;
  }
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { PaymentEntity } from '../entities/payment.entity.js';
import type { PaymentAttemptEntity } from '../entities/payment-attempt.entity.js';

export class PaymentAttemptResponseDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public publicAttemptId!: string;

  @ApiProperty()
  public attemptNumber!: number;

  @ApiProperty()
  public provider!: string;

  @ApiPropertyOptional()
  public providerAttemptId?: string | null;

  @ApiProperty()
  public amount!: string;

  @ApiProperty()
  public currency!: string;

  @ApiProperty()
  public status!: string;

  @ApiPropertyOptional()
  public failureCode?: string | null;

  @ApiPropertyOptional()
  public failureReason?: string | null;

  @ApiProperty()
  public startedAt!: string;

  @ApiPropertyOptional()
  public completedAt?: string | null;

  public static fromEntity(entity: PaymentAttemptEntity): PaymentAttemptResponseDto {
    const dto = new PaymentAttemptResponseDto();
    dto.id = entity.id;
    dto.publicAttemptId = entity.publicAttemptId;
    dto.attemptNumber = entity.attemptNumber;
    dto.provider = entity.provider;
    dto.providerAttemptId = entity.providerAttemptId ?? null;
    dto.amount = entity.amount;
    dto.currency = entity.currency;
    dto.status = entity.status;
    dto.failureCode = entity.failureCode ?? null;
    dto.failureReason = entity.failureReason ?? null;
    dto.startedAt = entity.startedAt.toISOString();
    dto.completedAt = entity.completedAt ? entity.completedAt.toISOString() : null;
    return dto;
  }
}

export class PaymentResponseDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public publicPaymentId!: string;

  @ApiProperty()
  public appointmentId!: string;

  @ApiProperty()
  public patientId!: string;

  @ApiProperty()
  public doctorId!: string;

  @ApiPropertyOptional()
  public consultationOfferId?: string | null;

  @ApiProperty()
  public amount!: string;

  @ApiProperty()
  public currency!: string;

  @ApiProperty()
  public status!: string;

  @ApiProperty()
  public provider!: string;

  @ApiPropertyOptional()
  public providerPaymentId?: string | null;

  @ApiPropertyOptional()
  public idempotencyKey?: string | null;

  @ApiPropertyOptional()
  public paidAt?: string | null;

  @ApiPropertyOptional()
  public failedAt?: string | null;

  @ApiPropertyOptional()
  public cancelledAt?: string | null;

  @ApiPropertyOptional()
  public failureReason?: string | null;

  @ApiProperty()
  public createdAt!: string;

  @ApiProperty()
  public updatedAt!: string;

  @ApiPropertyOptional({ type: [PaymentAttemptResponseDto] })
  public attempts?: PaymentAttemptResponseDto[];

  @ApiPropertyOptional()
  public clientSecret?: string;

  @ApiPropertyOptional()
  public checkoutUrl?: string;

  public static fromEntity(
    entity: PaymentEntity,
    extra?: { clientSecret?: string | undefined; checkoutUrl?: string | undefined } | undefined,
  ): PaymentResponseDto {
    const dto = new PaymentResponseDto();
    dto.id = entity.id;
    dto.publicPaymentId = entity.publicPaymentId;
    dto.appointmentId = entity.appointmentId;
    dto.patientId = entity.patientId;
    dto.doctorId = entity.doctorId;
    dto.consultationOfferId = entity.consultationOfferId ?? null;
    dto.amount = entity.amount;
    dto.currency = entity.currency;
    dto.status = entity.status;
    dto.provider = entity.provider;
    dto.providerPaymentId = entity.providerPaymentId ?? null;
    dto.idempotencyKey = entity.idempotencyKey ?? null;
    dto.paidAt = entity.paidAt ? entity.paidAt.toISOString() : null;
    dto.failedAt = entity.failedAt ? entity.failedAt.toISOString() : null;
    dto.cancelledAt = entity.cancelledAt ? entity.cancelledAt.toISOString() : null;
    dto.failureReason = entity.failureReason ?? null;
    dto.createdAt = entity.createdAt.toISOString();
    dto.updatedAt = entity.updatedAt.toISOString();
    if (entity.attempts && entity.attempts.length > 0) {
      dto.attempts = entity.attempts.map((a) => PaymentAttemptResponseDto.fromEntity(a));
    }
    if (extra?.clientSecret) {
      dto.clientSecret = extra.clientSecret;
    }
    if (extra?.checkoutUrl) {
      dto.checkoutUrl = extra.checkoutUrl;
    }
    return dto;
  }
}

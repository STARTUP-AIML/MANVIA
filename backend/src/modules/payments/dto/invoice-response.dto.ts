import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { InvoiceEntity } from '../entities/invoice.entity.js';

export class InvoiceResponseDto {
  @ApiProperty()
  public id!: string;

  @ApiProperty()
  public publicInvoiceId!: string;

  @ApiProperty()
  public invoiceNumber!: string;

  @ApiProperty()
  public paymentId!: string;

  @ApiProperty()
  public appointmentId!: string;

  @ApiProperty()
  public patientId!: string;

  @ApiProperty()
  public doctorId!: string;

  @ApiProperty()
  public subtotal!: string;

  @ApiProperty()
  public taxes!: string;

  @ApiProperty()
  public discount!: string;

  @ApiProperty()
  public platformFee!: string;

  @ApiProperty()
  public total!: string;

  @ApiProperty()
  public currency!: string;

  @ApiProperty()
  public status!: string;

  @ApiProperty()
  public issuedAt!: string;

  @ApiPropertyOptional()
  public paidAt?: string | null;

  @ApiPropertyOptional()
  public cancelledAt?: string | null;

  @ApiProperty()
  public createdAt!: string;

  public static fromEntity(entity: InvoiceEntity): InvoiceResponseDto {
    const dto = new InvoiceResponseDto();
    dto.id = entity.id;
    dto.publicInvoiceId = entity.publicInvoiceId;
    dto.invoiceNumber = entity.invoiceNumber;
    dto.paymentId = entity.paymentId;
    dto.appointmentId = entity.appointmentId;
    dto.patientId = entity.patientId;
    dto.doctorId = entity.doctorId;
    dto.subtotal = entity.subtotal;
    dto.taxes = entity.taxes;
    dto.discount = entity.discount;
    dto.platformFee = entity.platformFee;
    dto.total = entity.total;
    dto.currency = entity.currency;
    dto.status = entity.status;
    dto.issuedAt = entity.issuedAt.toISOString();
    dto.paidAt = entity.paidAt ? entity.paidAt.toISOString() : null;
    dto.cancelledAt = entity.cancelledAt ? entity.cancelledAt.toISOString() : null;
    dto.createdAt = entity.createdAt.toISOString();
    return dto;
  }
}

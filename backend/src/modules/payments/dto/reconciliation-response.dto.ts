import { ApiProperty } from '@nestjs/swagger';

export interface ReconciliationDiscrepancy {
  entityType: 'PAYMENT' | 'PAYOUT' | 'REFUND';
  internalId: string;
  publicId: string;
  providerPaymentId?: string | undefined;
  internalStatus: string;
  providerStatus: string;
  internalAmount: string;
  providerAmount?: string | undefined;
  discrepancyType:
    'STATUS_MISMATCH' | 'AMOUNT_MISMATCH' | 'MISSING_IN_PROVIDER' | 'MISSING_INTERNALLY';
  details?: string | undefined;
}

export class ReconciliationSummaryDto {
  @ApiProperty()
  public totalChecked!: number;

  @ApiProperty()
  public matched!: number;

  @ApiProperty()
  public discrepanciesCount!: number;

  @ApiProperty()
  public discrepancies!: ReconciliationDiscrepancy[];

  @ApiProperty()
  public checkedAt!: string;
}

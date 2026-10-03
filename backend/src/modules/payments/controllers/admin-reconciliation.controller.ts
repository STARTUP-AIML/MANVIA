import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../../doctors/decorators/current-user.decorator.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';
import { PaymentAuthGuard } from '../guards/payment-auth.guard.js';
import { ReconciliationService } from '../services/reconciliation.service.js';
import { ReconciliationSummaryDto } from '../dto/index.js';
import { ForbiddenError } from '../../../common/errors/app-error.js';

@ApiTags('Admin Reconciliation')
@Controller('admin')
@UseGuards(PaymentAuthGuard)
@ApiBearerAuth('bearer-auth')
export class AdminReconciliationController {
  public constructor(private readonly reconciliationService: ReconciliationService) {}

  @Get('payments/reconciliation')
  @ApiOperation({
    summary: 'Reconcile MANVIA payments against provider records (Admin only)',
    description: 'Detects status or amount drift between internal records and payment gateways.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reconciliation summary',
    type: ReconciliationSummaryDto,
  })
  public async reconcilePayments(
    @CurrentUser() actor: CurrentUserContext,
  ): Promise<ReconciliationSummaryDto> {
    if (actor.activeRole !== 'ADMIN') {
      throw new ForbiddenError(
        'Reconciliation operations are restricted to platform administrators',
      );
    }
    return this.reconciliationService.reconcilePayments();
  }

  @Get('payouts/reconciliation')
  @ApiOperation({
    summary: 'Reconcile doctor payouts against payout provider records (Admin only)',
    description: 'Detects discrepancies between internal payout records and disbursement gateway.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payout reconciliation summary',
    type: ReconciliationSummaryDto,
  })
  public async reconcilePayouts(
    @CurrentUser() actor: CurrentUserContext,
  ): Promise<ReconciliationSummaryDto> {
    if (actor.activeRole !== 'ADMIN') {
      throw new ForbiddenError(
        'Reconciliation operations are restricted to platform administrators',
      );
    }
    return this.reconciliationService.reconcilePayouts();
  }
}

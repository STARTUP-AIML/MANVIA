import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { RefundStatus } from '../enums/refund-status.enum.js';
import type {
  IRefundProvider,
  RefundExecutionRequest,
  RefundExecutionResult,
} from '../interfaces/refund-provider.interface.js';

@Injectable()
export class SimulatedRefundProvider implements IRefundProvider {
  private readonly logger = new Logger(SimulatedRefundProvider.name);

  public async executeRefund(request: RefundExecutionRequest): Promise<RefundExecutionResult> {
    if (request.reason && request.reason.includes('fail-simulation')) {
      this.logger.warn(
        `[REFUND_PROVIDER] Simulated refund failure triggered for appointment ${request.appointmentId}`,
      );
      return {
        success: false,
        status: RefundStatus.FAILED,
        failureReason: 'Simulated provider failure: gateway unavailable',
        processedAt: new Date(),
      };
    }

    const reference = `sim_ref_${randomBytes(6).toString('hex')}`;
    this.logger.log(
      `[REFUND_PROVIDER] Simulated refund executed for appointment ${request.appointmentId}: amount=${request.amount} ${request.currency}, ref=${reference}`,
    );

    return {
      success: true,
      status: RefundStatus.SUCCEEDED,
      providerReference: reference,
      processedAt: new Date(),
    };
  }
}

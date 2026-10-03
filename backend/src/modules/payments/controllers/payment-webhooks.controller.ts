import { Controller, Post, Param, Headers, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PaymentWebhookService } from '../services/payment-webhook.service.js';

@ApiTags('Payment Webhooks')
@Controller('payments/webhooks')
export class PaymentWebhooksController {
  public constructor(private readonly webhookService: PaymentWebhookService) {}

  @Post(':provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive and process payment gateway webhook',
    description:
      'Validates provider HMAC signature, checks event idempotency, atomically transitions payment state, issues invoice and emits domain events.',
  })
  @ApiParam({
    name: 'provider',
    description: 'Payment provider identifier (e.g. simulated, stripe, razorpay)',
    example: 'simulated',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Webhook signature verification failed',
  })
  public async handleWebhook(
    @Param('provider') provider: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: Record<string, unknown> | string,
  ): Promise<{ received: boolean; processed: boolean; duplicate: boolean }> {
    const rawPayload = typeof body === 'string' ? body : JSON.stringify(body);
    const result = await this.webhookService.handleWebhook(provider, headers, rawPayload);

    return {
      received: true,
      processed: result.processed,
      duplicate: result.duplicate,
    };
  }
}

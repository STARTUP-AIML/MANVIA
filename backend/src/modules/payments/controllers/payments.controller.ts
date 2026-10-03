import { Controller, Get, Post, Body, Param, Query, UseGuards, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CurrentUser } from '../../doctors/decorators/current-user.decorator.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';
import { PaymentAuthGuard } from '../guards/payment-auth.guard.js';
import { PaymentsService } from '../services/payments.service.js';
import {
  CreatePaymentDto,
  VerifyPaymentDto,
  PaymentQueryDto,
  PaymentResponseDto,
  PaymentAttemptResponseDto,
} from '../dto/index.js';

@ApiTags('Payments')
@Controller('payments')
@UseGuards(PaymentAuthGuard)
@ApiBearerAuth('bearer-auth')
export class PaymentsController {
  public constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({
    summary: 'Initiate a new payment session for an eligible appointment',
    description:
      'Creates a Payment and PaymentAttempt, obtains checkout reference from provider. Amount is derived strictly server-side.',
  })
  @ApiResponse({
    status: 201,
    description: 'Payment session created successfully',
    type: PaymentResponseDto,
  })
  public async createPayment(
    @CurrentUser() actor: CurrentUserContext,
    @Body() dto: CreatePaymentDto,
    @Headers('idempotency-key') headerIdempotencyKey?: string,
  ): Promise<PaymentResponseDto> {
    if (!dto.idempotencyKey && headerIdempotencyKey) {
      dto.idempotencyKey = headerIdempotencyKey;
    }
    return this.paymentsService.createPayment(dto, actor);
  }

  @Get()
  @ApiOperation({
    summary: 'List payments scoped to authenticated user role',
    description: 'Patients see their payments; doctors see consultation payments; admins see all.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of payments',
  })
  public async getPayments(
    @CurrentUser() actor: CurrentUserContext,
    @Query() query: PaymentQueryDto,
  ): Promise<{ items: PaymentResponseDto[]; total: number }> {
    return this.paymentsService.getPayments(query, actor);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get payment details by ID or public reference',
  })
  @ApiParam({ name: 'id', description: 'Internal UUID or public payment ID (PAY-XXXXXXXX)' })
  @ApiResponse({
    status: 200,
    description: 'Payment retrieved successfully',
    type: PaymentResponseDto,
  })
  public async getPaymentById(
    @CurrentUser() actor: CurrentUserContext,
    @Param('id') id: string,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.getPaymentById(id, actor);
  }

  @Get(':id/attempts')
  @ApiOperation({
    summary: 'Get historical payment attempts for a payment',
  })
  @ApiParam({ name: 'id', description: 'Internal UUID or public payment ID (PAY-XXXXXXXX)' })
  @ApiResponse({
    status: 200,
    description: 'List of payment attempts',
    type: [PaymentAttemptResponseDto],
  })
  public async getPaymentAttempts(
    @CurrentUser() actor: CurrentUserContext,
    @Param('id') id: string,
  ): Promise<PaymentAttemptResponseDto[]> {
    return this.paymentsService.getPaymentAttempts(id, actor);
  }

  @Post(':id/verify')
  @ApiOperation({
    summary: 'Verify payment with server-side provider check',
    description:
      'Performs trusted cryptographic signature / provider verification. Client success claims are not trusted.',
  })
  @ApiParam({ name: 'id', description: 'Internal UUID or public payment ID (PAY-XXXXXXXX)' })
  @ApiResponse({
    status: 200,
    description: 'Payment verified successfully',
    type: PaymentResponseDto,
  })
  public async verifyPayment(
    @CurrentUser() actor: CurrentUserContext,
    @Param('id') id: string,
    @Body() dto: VerifyPaymentDto,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.verifyPayment(id, dto, actor);
  }
}

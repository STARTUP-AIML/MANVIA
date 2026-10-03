import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CurrentUser } from '../../doctors/decorators/current-user.decorator.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';
import { PaymentAuthGuard } from '../guards/payment-auth.guard.js';
import { DoctorPayoutService } from '../services/doctor-payout.service.js';
import { PayoutQueryDto, DoctorPayoutResponseDto } from '../dto/index.js';

@ApiTags('Doctor Payouts')
@Controller('payouts')
@UseGuards(PaymentAuthGuard)
@ApiBearerAuth('bearer-auth')
export class DoctorPayoutsController {
  public constructor(private readonly payoutService: DoctorPayoutService) {}

  @Get()
  @ApiOperation({
    summary: 'List payouts for the authenticated doctor or platform admin',
    description: 'Doctors can only view their own payouts. Patients are denied access.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of payouts',
  })
  public async getPayouts(
    @CurrentUser() actor: CurrentUserContext,
    @Query() query: PayoutQueryDto,
  ): Promise<{ items: DoctorPayoutResponseDto[]; total: number }> {
    const { items, total } = await this.payoutService.getPayouts(query, actor);
    return {
      items: items.map((p) => DoctorPayoutResponseDto.fromEntity(p)),
      total,
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get single payout details',
    description: 'Doctors can only view their own payout. Patients are denied access.',
  })
  @ApiParam({ name: 'id', description: 'Internal UUID or public payout ID (PO-XXXXXXXX)' })
  @ApiResponse({
    status: 200,
    description: 'Doctor payout details',
    type: DoctorPayoutResponseDto,
  })
  public async getPayoutById(
    @CurrentUser() actor: CurrentUserContext,
    @Param('id') id: string,
  ): Promise<DoctorPayoutResponseDto> {
    const payout = await this.payoutService.getPayoutById(id, actor);
    return DoctorPayoutResponseDto.fromEntity(payout);
  }

  @Post(':id/process')
  @ApiOperation({
    summary: 'Execute payout disbursement (Admin only)',
    description: 'Dispatches payout to provider and updates ledger. Restricted to ADMIN.',
  })
  @ApiParam({ name: 'id', description: 'Internal UUID or public payout ID (PO-XXXXXXXX)' })
  @ApiResponse({
    status: 200,
    description: 'Payout processed',
    type: DoctorPayoutResponseDto,
  })
  public async processPayout(
    @CurrentUser() actor: CurrentUserContext,
    @Param('id') id: string,
  ): Promise<DoctorPayoutResponseDto> {
    const payout = await this.payoutService.processPayout(id, actor);
    return DoctorPayoutResponseDto.fromEntity(payout);
  }
}

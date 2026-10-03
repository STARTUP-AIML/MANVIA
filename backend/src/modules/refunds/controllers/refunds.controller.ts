import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../doctors/decorators/current-user.decorator.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';
import { RefundAuthGuard } from '../guards/refund-auth.guard.js';
import { RefundsService } from '../services/refunds.service.js';
import { RefundQueryDto, RefundResponseDto, PaginatedRefundsResponseDto } from '../dto/index.js';

@ApiTags('Refunds')
@Controller('refunds')
@UseGuards(RefundAuthGuard)
@ApiBearerAuth('bearer-auth')
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Get()
  @ApiOperation({
    summary: 'List refunds for the authenticated user',
    description: 'Patients view refunds for their appointments. Admins view platform-wide refunds.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of refunds',
    type: PaginatedRefundsResponseDto,
  })
  public async getRefunds(
    @CurrentUser() user: CurrentUserContext,
    @Query() query: RefundQueryDto,
  ): Promise<PaginatedRefundsResponseDto> {
    return this.refundsService.getPatientRefunds(user.userId, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get single refund details',
    description:
      'Retrieves details for a specific refund by internal UUID or public ID (REF-XXXXXXXX). Strictly enforces patient/doctor/admin authorization.',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal refund UUID or public ID (REF-XXXXXXXX)',
  })
  @ApiResponse({
    status: 200,
    description: 'Refund retrieved successfully',
    type: RefundResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden access to another party’s refund' })
  @ApiResponse({ status: 404, description: 'Refund not found' })
  public async getRefundById(
    @CurrentUser() user: CurrentUserContext,
    @Param('id') id: string,
  ): Promise<RefundResponseDto> {
    return this.refundsService.getRefundById(user, id);
  }
}

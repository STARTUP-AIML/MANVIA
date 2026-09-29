import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DoctorAuthGuard } from '../../doctors/guards/doctor-auth.guard.js';
import { CurrentUser } from '../../doctors/decorators/current-user.decorator.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';
import { CareRelationshipsService } from '../services/care-relationships.service.js';
import { ConsentsService } from '../services/consents.service.js';
import { CareRelationshipResponseDto } from '../dto/care-relationship-response.dto.js';
import {
  ResourceAccessCheckQueryDto,
  ResourceAccessDecisionDto,
} from '../dto/resource-access-check.dto.js';

@ApiTags('Doctor Care Relationships')
@Controller('doctors/me/care-relationships')
@UseGuards(DoctorAuthGuard)
@ApiBearerAuth('bearer-auth')
export class DoctorCareRelationshipsController {
  constructor(
    private readonly careRelService: CareRelationshipsService,
    private readonly consentsService: ConsentsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List patient care relationships for authenticated physician',
    description: 'Returns all active and historical care relationships established with patients.',
  })
  @ApiResponse({
    status: 200,
    description: 'Care relationships retrieved successfully',
    type: [CareRelationshipResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Doctor role required' })
  public async getDoctorCareRelationships(
    @CurrentUser() user: CurrentUserContext,
  ): Promise<CareRelationshipResponseDto[]> {
    return this.careRelService.getDoctorCareRelationships(user.userId);
  }

  @Get('access')
  @ApiOperation({
    summary: 'Check authorization and consent for a patient resource',
    description:
      'Evaluates server-side whether the physician currently holds active authorization and unexpired consent for a specific patient resource category.',
  })
  @ApiResponse({
    status: 200,
    description: 'Resource access evaluation result',
    type: ResourceAccessDecisionDto,
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Doctor role required' })
  public async checkResourceAccess(
    @CurrentUser() user: CurrentUserContext,
    @Query() query: ResourceAccessCheckQueryDto,
  ): Promise<ResourceAccessDecisionDto> {
    return this.consentsService.checkDoctorAccess(user.userId, query);
  }
}

import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DoctorAuthGuard } from '../../doctors/guards/doctor-auth.guard.js';
import { CareRelationshipGuard } from '../../care-relationships/guards/care-relationship.guard.js';
import { ConsentGuard } from '../../care-relationships/guards/consent.guard.js';
import { RequireConsent } from '../../care-relationships/decorators/require-consent.decorator.js';
import { ConsentScope } from '../../care-relationships/enums/consent-scope.enum.js';
import { CurrentUser } from '../../doctors/decorators/current-user.decorator.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';
import { WellnessService } from '../services/wellness.service.js';
import {
  PaginatedWellnessCheckInsResponseDto,
  WellnessQueryDto,
  WellnessTrendsQueryDto,
  WellnessTrendsResponseDto,
} from '../dto/index.js';

@ApiTags('Doctor Patient Wellness')
@Controller('doctors/me/patients/:patientId/wellness')
@UseGuards(DoctorAuthGuard, CareRelationshipGuard, ConsentGuard)
@RequireConsent(ConsentScope.WELLNESS)
@ApiBearerAuth('bearer-auth')
export class DoctorWellnessController {
  constructor(private readonly wellnessService: WellnessService) {}

  @Get('check-ins')
  @ApiOperation({
    summary: 'View patient wellness check-ins (Physician Access)',
    description:
      'Allows a verified physician with an active care relationship and explicit patient consent (WELLNESS scope) to view historical check-in logs.',
  })
  @ApiParam({
    name: 'patientId',
    description: 'Internal patient profile UUID or public ID (PAT-XXXXXXXX)',
  })
  @ApiResponse({
    status: 200,
    description: 'Patient check-ins retrieved under valid consent',
    type: PaginatedWellnessCheckInsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({
    status: 403,
    description:
      'Access denied: requires verified physician, care relationship, and active WELLNESS consent',
  })
  @ApiResponse({ status: 404, description: 'Patient resource not found' })
  public async getPatientCheckIns(
    @CurrentUser() user: CurrentUserContext,
    @Param('patientId') patientId: string,
    @Query() query: WellnessQueryDto,
  ): Promise<PaginatedWellnessCheckInsResponseDto> {
    return this.wellnessService.getPatientCheckInsForDoctor(user.userId, patientId, query);
  }

  @Get('trends')
  @ApiOperation({
    summary: 'View patient longitudinal wellness trends (Physician Access)',
    description:
      'Allows an authorized physician to view longitudinal wellness trend calculations and descriptive period summaries.',
  })
  @ApiParam({
    name: 'patientId',
    description: 'Internal patient profile UUID or public ID (PAT-XXXXXXXX)',
  })
  @ApiResponse({
    status: 200,
    description: 'Patient wellness trends retrieved under valid consent',
    type: WellnessTrendsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({
    status: 403,
    description:
      'Access denied: requires verified physician, care relationship, and active WELLNESS consent',
  })
  @ApiResponse({ status: 404, description: 'Patient resource not found' })
  public async getPatientTrends(
    @CurrentUser() user: CurrentUserContext,
    @Param('patientId') patientId: string,
    @Query() query: WellnessTrendsQueryDto,
  ): Promise<WellnessTrendsResponseDto> {
    return this.wellnessService.getPatientTrendsForDoctor(user.userId, patientId, query);
  }

  @Get('analytics')
  @ApiOperation({
    summary: 'View patient longitudinal wellness analytics (alias)',
    description: 'Alias endpoint for physician viewing patient wellness trends.',
  })
  public async getPatientAnalyticsAlias(
    @CurrentUser() user: CurrentUserContext,
    @Param('patientId') patientId: string,
    @Query() query: WellnessTrendsQueryDto,
  ): Promise<WellnessTrendsResponseDto> {
    return this.getPatientTrends(user, patientId, query);
  }
}

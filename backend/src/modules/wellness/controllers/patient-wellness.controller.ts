import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PatientAuthGuard } from '../../care-relationships/guards/patient-auth.guard.js';
import { CurrentUser } from '../../doctors/decorators/current-user.decorator.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';
import { WellnessService } from '../services/wellness.service.js';
import {
  CreateWellnessCheckInDto,
  PaginatedWellnessCheckInsResponseDto,
  UpdateWellnessCheckInDto,
  WellnessCheckInResponseDto,
  WellnessQueryDto,
  WellnessSummaryResponseDto,
  WellnessTrendsQueryDto,
  WellnessTrendsResponseDto,
} from '../dto/index.js';

@ApiTags('Wellness Engine')
@Controller('wellness')
@UseGuards(PatientAuthGuard)
@ApiBearerAuth('bearer-auth')
export class PatientWellnessController {
  constructor(private readonly wellnessService: WellnessService) {}

  @Post('check-ins')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit daily wellness check-in',
    description:
      'Records subjective wellness metrics (mood, stress, energy, sleep quality, optional sleep duration and journal reflection). Non-diagnostic and owned strictly by the patient.',
  })
  @ApiResponse({
    status: 201,
    description: 'Wellness check-in recorded successfully',
    type: WellnessCheckInResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation failed on metric boundaries' })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Patient role required' })
  public async recordCheckIn(
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: CreateWellnessCheckInDto,
  ): Promise<WellnessCheckInResponseDto> {
    return this.wellnessService.recordCheckIn(user.userId, dto);
  }

  // Alias for compatibility with /checkins
  @Post('checkins')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit daily wellness check-in (alias)',
    description: 'Alias endpoint for submitting a daily wellness check-in.',
  })
  public async recordCheckInAlias(
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: CreateWellnessCheckInDto,
  ): Promise<WellnessCheckInResponseDto> {
    return this.recordCheckIn(user, dto);
  }

  @Get('check-ins')
  @ApiOperation({
    summary: 'List longitudinal wellness check-ins',
    description:
      'Retrieves paginated historical wellness check-ins for the authenticated patient, bounded by date ranges.',
  })
  @ApiResponse({
    status: 200,
    description: 'Check-ins retrieved successfully',
    type: PaginatedWellnessCheckInsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Patient role required' })
  public async getCheckIns(
    @CurrentUser() user: CurrentUserContext,
    @Query() query: WellnessQueryDto,
  ): Promise<PaginatedWellnessCheckInsResponseDto> {
    return this.wellnessService.getPatientCheckIns(user.userId, query);
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Get wellness summary and streak metrics',
    description:
      'Provides high-level patient metrics including latest check-in, today check-in status, logging streak, and total check-in count.',
  })
  @ApiResponse({
    status: 200,
    description: 'Wellness summary retrieved successfully',
    type: WellnessSummaryResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Patient role required' })
  public async getSummary(
    @CurrentUser() user: CurrentUserContext,
    @Query('timezone') timezone?: string,
  ): Promise<WellnessSummaryResponseDto> {
    return this.wellnessService.getPatientSummary(user.userId, timezone);
  }

  @Get('trends')
  @ApiOperation({
    summary: 'Get longitudinal wellness trends and non-diagnostic descriptive insights',
    description:
      'Computes statistical averages, period-over-period delta comparisons, and purely descriptive non-clinical insights. Enforces a minimum of 3 check-ins before evaluating directional trends.',
  })
  @ApiResponse({
    status: 200,
    description: 'Trends and descriptive insights generated successfully',
    type: WellnessTrendsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Patient role required' })
  public async getTrends(
    @CurrentUser() user: CurrentUserContext,
    @Query() query: WellnessTrendsQueryDto,
  ): Promise<WellnessTrendsResponseDto> {
    return this.wellnessService.getPatientTrends(user.userId, query);
  }

  // Alias for /analytics
  @Get('analytics')
  @ApiOperation({
    summary: 'Longitudinal wellness analytics (alias)',
    description: 'Alias endpoint for longitudinal wellness trends.',
  })
  public async getAnalyticsAlias(
    @CurrentUser() user: CurrentUserContext,
    @Query() query: WellnessTrendsQueryDto,
  ): Promise<WellnessTrendsResponseDto> {
    return this.getTrends(user, query);
  }

  @Get('check-ins/:id')
  @ApiOperation({
    summary: 'Retrieve single wellness check-in by ID',
    description:
      'Returns detailed check-in metrics. Strictly enforces patient ownership; returns 404 for records belonging to another user.',
  })
  @ApiParam({ name: 'id', description: 'Internal UUID of the check-in' })
  @ApiResponse({
    status: 200,
    description: 'Check-in retrieved successfully',
    type: WellnessCheckInResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Patient role required' })
  @ApiResponse({ status: 404, description: 'Wellness check-in not found' })
  public async getCheckInById(
    @CurrentUser() user: CurrentUserContext,
    @Param('id') id: string,
  ): Promise<WellnessCheckInResponseDto> {
    return this.wellnessService.getPatientCheckInById(user.userId, id);
  }

  @Patch('check-ins/:id')
  @ApiOperation({
    summary: 'Update existing wellness check-in',
    description: 'Updates specific metrics or personal notes for an owned check-in.',
  })
  @ApiParam({ name: 'id', description: 'Internal UUID of the check-in' })
  @ApiResponse({
    status: 200,
    description: 'Check-in updated successfully',
    type: WellnessCheckInResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Patient role required' })
  @ApiResponse({ status: 404, description: 'Wellness check-in not found' })
  public async updateCheckIn(
    @CurrentUser() user: CurrentUserContext,
    @Param('id') id: string,
    @Body() dto: UpdateWellnessCheckInDto,
  ): Promise<WellnessCheckInResponseDto> {
    return this.wellnessService.updatePatientCheckIn(user.userId, id, dto);
  }

  @Delete('check-ins/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete existing wellness check-in',
    description:
      'Permanently deletes a wellness check-in. Strictly enforces patient ownership; returns 404 for records of another user.',
  })
  @ApiParam({ name: 'id', description: 'Internal UUID of the check-in' })
  @ApiResponse({ status: 204, description: 'Check-in deleted successfully' })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Patient role required' })
  @ApiResponse({ status: 404, description: 'Wellness check-in not found' })
  public async deleteCheckIn(
    @CurrentUser() user: CurrentUserContext,
    @Param('id') id: string,
  ): Promise<void> {
    return this.wellnessService.deletePatientCheckIn(user.userId, id);
  }
}

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PatientAuthGuard } from '../../care-relationships/guards/patient-auth.guard.js';
import { CurrentUser } from '../../doctors/decorators/current-user.decorator.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';
import { HealthTimelineService } from '../services/health-timeline.service.js';
import { PaginatedTimelineResponseDto, TimelineQueryDto } from '../dto/index.js';

@ApiTags('Patient Health Timeline')
@Controller('health-timeline')
@UseGuards(PatientAuthGuard)
@ApiBearerAuth('bearer-auth')
export class PatientHealthTimelineController {
  constructor(private readonly healthTimelineService: HealthTimelineService) {}

  @Get()
  @ApiOperation({
    summary: 'View patient longitudinal health timeline',
    description:
      'Retrieves a chronological, normalized longitudinal feed of health events (records, check-ins, appointments) with deterministic sorting.',
  })
  @ApiResponse({
    status: 200,
    description: 'Longitudinal health timeline events retrieved',
    type: PaginatedTimelineResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Patient role required' })
  public async getTimeline(
    @CurrentUser() user: CurrentUserContext,
    @Query() query: TimelineQueryDto,
  ): Promise<PaginatedTimelineResponseDto> {
    return this.healthTimelineService.getPatientTimeline(user.userId, query);
  }
}

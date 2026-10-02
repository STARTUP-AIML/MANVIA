import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminAuthGuard } from '../guards/admin-auth.guard.js';
import { AdminUser } from '../decorators/admin-user.decorator.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';
import { AdminAISafetyService } from '../services/admin-ai-safety.service.js';
import { AdminAISafetyQueryDto } from '../dto/admin-ai-safety-query.dto.js';
import { AdminAIHandoffQueryDto } from '../dto/admin-ai-handoff-query.dto.js';
import { AdjudicateAIHandoffDto } from '../dto/adjudicate-ai-handoff.dto.js';

@ApiTags('Admin AI Safety & Handoff')
@Controller('admin/ai')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth('bearer-auth')
export class AdminAISafetyController {
  constructor(private readonly adminAISafetyService: AdminAISafetyService) {}

  @Get('safety-events')
  @ApiOperation({
    summary: 'List AI safety events and crisis interventions (Admin Only)',
    description:
      'Filter and review automated safety classifications, emergency escalations, and rules triggered.',
  })
  @ApiResponse({ status: 200, description: 'AI safety events retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Administrator role required' })
  public async listSafetyEvents(@Query() query: AdminAISafetyQueryDto) {
    return this.adminAISafetyService.listSafetyEvents(query);
  }

  @Get('human-handoffs')
  @ApiOperation({
    summary: 'List AI-to-human clinical escalation queue (Admin Only)',
    description:
      'Review pending and triaged handoff requests triggered during patient conversations.',
  })
  @ApiResponse({ status: 200, description: 'AI human handoffs retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Administrator role required' })
  public async listHumanHandoffs(@Query() query: AdminAIHandoffQueryDto) {
    return this.adminAISafetyService.listHumanHandoffs(query);
  }

  @Post('human-handoffs/:handoffId/adjudicate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Adjudicate an AI human handoff ticket (Admin Only)',
    description:
      'Update handoff status (e.g. ASSIGNED, ACCEPTED, COMPLETED, CANCELLED), assign a physician, and record triage notes.',
  })
  @ApiParam({ name: 'handoffId', description: 'UUID of the human handoff entry' })
  @ApiResponse({ status: 200, description: 'Handoff adjudicated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid handoff status or missing notes' })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Administrator role required' })
  @ApiResponse({ status: 404, description: 'Handoff ticket not found' })
  public async adjudicateHandoff(
    @Param('handoffId') handoffId: string,
    @Body() dto: AdjudicateAIHandoffDto,
    @AdminUser() adminUser: CurrentUserContext,
  ) {
    return this.adminAISafetyService.adjudicateHandoff(handoffId, dto, adminUser.userId);
  }
}

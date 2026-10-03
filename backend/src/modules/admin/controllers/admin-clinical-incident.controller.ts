import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { AdminAuthGuard } from '../guards/admin-auth.guard.js';
import { AdminUser } from '../decorators/admin-user.decorator.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';
import { AdminClinicalIncidentService } from '../services/admin-clinical-incident.service.js';
import { BreakGlassAccessDto } from '../dto/break-glass-access.dto.js';

@ApiTags('Admin Clinical Safety Incident Governance')
@Controller('admin/clinical-incidents')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth('bearer-auth')
export class AdminClinicalIncidentController {
  constructor(private readonly clinicalIncidentService: AdminClinicalIncidentService) {}

  @Post('break-glass')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Emergency break-glass access to patient clinical record (Admin Only)',
    description:
      'Provides strictly audited, temporary emergency access to confidential patient health records exclusively during an active clinical safety or critical IT incident investigation. Requires mandatory ticket ID and formal justification. Immutable audit log is created immediately.',
  })
  @ApiResponse({ status: 200, description: 'Emergency break-glass access authorized and audited' })
  @ApiResponse({ status: 400, description: 'Terms not acknowledged or justification too short' })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Administrator role required' })
  @ApiResponse({ status: 404, description: 'Target patient not found' })
  public async executeBreakGlassAccess(
    @Body() dto: BreakGlassAccessDto,
    @AdminUser() adminUser: CurrentUserContext,
    @Req() req: FastifyRequest,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
    const userAgent = req.headers['user-agent'] as string | undefined;

    return this.clinicalIncidentService.executeBreakGlassAccess(
      dto,
      adminUser.userId,
      ipAddress,
      userAgent,
    );
  }
}

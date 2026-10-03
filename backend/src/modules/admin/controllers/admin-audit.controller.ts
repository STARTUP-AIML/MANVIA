import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminAuthGuard } from '../guards/admin-auth.guard.js';
import { AdminAuditService } from '../services/admin-audit.service.js';
import { AdminAuditQueryDto } from '../dto/admin-audit-query.dto.js';

@ApiTags('Admin Audit Trail')
@Controller('admin/audit-logs')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth('bearer-auth')
export class AdminAuditController {
  constructor(private readonly adminAuditService: AdminAuditService) {}

  @Get()
  @ApiOperation({
    summary: 'Search immutable audit logs (Admin Only)',
    description:
      'Query the complete platform audit log stream by actor, action name, resource type, status, or date range.',
  })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Administrator role required' })
  public async queryAuditLogs(@Query() query: AdminAuditQueryDto) {
    return this.adminAuditService.queryAuditLogs(query);
  }
}

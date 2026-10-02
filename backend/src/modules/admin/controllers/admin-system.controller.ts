import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminAuthGuard } from '../guards/admin-auth.guard.js';
import { AdminUser } from '../decorators/admin-user.decorator.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';
import { SystemKillSwitchService } from '../services/system-kill-switch.service.js';
import { KillSwitchDto } from '../dto/kill-switch.dto.js';

@ApiTags('Admin System Emergency Controls')
@Controller('admin/system')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth('bearer-auth')
export class AdminSystemController {
  constructor(private readonly killSwitchService: SystemKillSwitchService) {}

  @Get('status')
  @ApiOperation({
    summary: 'Retrieve operational system status and emergency switch states (Admin Only)',
    description:
      'Returns real-time status of all platform subsystems, uptime, and active kill switches.',
  })
  @ApiResponse({ status: 200, description: 'System status retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Administrator role required' })
  public async getSystemStatus() {
    return this.killSwitchService.getSystemStatus();
  }

  @Post('kill-switches')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Engage or disengage an emergency subsystem kill switch (Admin Only)',
    description:
      'Immediately toggles the runtime state of a platform subsystem (e.g. REALTIME_VOICE_GATEWAY, AI_COMPANION, PAYMENTS_GATEWAY). Requires mandatory technical justification.',
  })
  @ApiResponse({ status: 200, description: 'Subsystem kill switch toggled and audited' })
  @ApiResponse({
    status: 400,
    description: 'Invalid subsystem identifier or justification too short',
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Administrator role required' })
  public async toggleKillSwitch(
    @Body() dto: KillSwitchDto,
    @AdminUser() adminUser: CurrentUserContext,
  ) {
    return this.killSwitchService.toggleSwitch(dto, adminUser.userId);
  }
}

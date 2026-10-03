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
import { AdminUsersService } from '../services/admin-users.service.js';
import { AdminUserQueryDto } from '../dto/admin-user-query.dto.js';
import { UpdateUserStatusDto } from '../dto/update-user-status.dto.js';

@ApiTags('Admin User Governance')
@Controller('admin/users')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth('bearer-auth')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @ApiOperation({
    summary: 'List users with administrative filters (Admin Only)',
    description: 'Paginated user directory supporting role, account status, and search filters.',
  })
  @ApiResponse({ status: 200, description: 'User list retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Administrator role required' })
  public async listUsers(@Query() query: AdminUserQueryDto) {
    return this.adminUsersService.listUsers(query);
  }

  @Get(':userId')
  @ApiOperation({
    summary: 'Retrieve user details and profile links (Admin Only)',
    description: 'Returns identity state, profile mappings, session counts, and lockout details.',
  })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User details retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Administrator role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  public async getUserById(@Param('userId') userId: string) {
    return this.adminUsersService.getUserById(userId);
  }

  @Post(':userId/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update user account status with mandatory reason (Admin Only)',
    description:
      'Transitions account status (ACTIVE, SUSPENDED, LOCKED, DEACTIVATED). Drops active sessions immediately if status is non-active.',
  })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({
    status: 200,
    description: 'Account status updated and sessions revoked if suspended',
  })
  @ApiResponse({ status: 400, description: 'Invalid status or reason too short' })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Administrator role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Administrator self-suspension/lockout prohibited' })
  public async updateUserStatus(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserStatusDto,
    @AdminUser() adminUser: CurrentUserContext,
  ) {
    return this.adminUsersService.updateUserStatus(userId, dto, adminUser.userId);
  }
}

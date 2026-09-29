// ==============================================================================
// MANVIA — Authorization & Role Management Controller
// ==============================================================================
// Phase 5: Active Role Switching & Permission Verification Endpoints
// ==============================================================================

import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.interface.js';
import { TokenService } from '../auth/services/token.service.js';
import { AuthAuditService } from '../auth/services/auth-audit.service.js';
import { PermissionService } from './services/permission.service.js';
import { SwitchRoleDto } from './dto/switch-role.dto.js';
import { SwitchRoleResponseDto } from './dto/switch-role-response.dto.js';
import { ForbiddenError } from '../../common/errors/app-error.js';

@ApiTags('Authentication & Authorization')
@ApiBearerAuth('JWT')
@Controller({ path: 'auth', version: '1' })
export class AuthorizationController {
  constructor(
    private readonly tokenService: TokenService,
    private readonly permissionService: PermissionService,
    private readonly auditService: AuthAuditService,
  ) {}

  @Post('switch-role')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Switch active user role',
    description:
      'Switches the active role for the authenticated session, returning a new access token. Target role must already be assigned to the user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Active role successfully updated',
    type: SwitchRoleResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or expired authentication token' })
  @ApiForbiddenResponse({ description: 'User does not possess the requested role' })
  public async switchRole(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SwitchRoleDto,
  ): Promise<SwitchRoleResponseDto> {
    // 1. Server-side validation: target role must be explicitly assigned to the user
    if (!user.roles.includes(dto.role)) {
      await this.auditService.logEvent({
        actorUserId: user.id,
        action: 'AUTH.ROLE_SWITCH_FAILURE',
        resourceType: 'AUTHORIZATION',
        status: 'FAILURE',
        details: {
          requestedRole: dto.role,
          assignedRoles: user.roles,
          reason: 'ROLE_NOT_ASSIGNED',
        },
      });

      throw new ForbiddenError('User is not assigned the requested role');
    }

    // 2. Mint new access token reflecting the newly active role
    const { accessToken, expiresInSeconds } = this.tokenService.generateAccessToken({
      userId: user.id,
      sessionId: user.sessionId,
      roles: user.roles,
      activeRole: dto.role,
    });

    // 3. Record successful security audit event
    await this.auditService.logEvent({
      actorUserId: user.id,
      action: 'AUTH.ROLE_SWITCH_SUCCESS',
      resourceType: 'AUTHORIZATION',
      status: 'SUCCESS',
      details: {
        previousActiveRole: user.activeRole,
        newActiveRole: dto.role,
      },
    });

    return SwitchRoleResponseDto.from({
      accessToken,
      expiresInSeconds,
      activeRole: dto.role,
      roles: user.roles,
    });
  }

  @Get('permissions')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Get permissions for current active role',
    description: 'Returns the active role and granular permissions assigned to that role.',
  })
  @ApiResponse({
    status: 200,
    description: 'Permissions list for the active role',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or expired authentication token' })
  public getPermissions(@CurrentUser() user: AuthenticatedUser): {
    activeRole: string;
    roles: string[];
    permissions: readonly string[];
  } {
    const permissions = this.permissionService.getPermissionsForRole(user.activeRole);
    return {
      activeRole: user.activeRole,
      roles: user.roles,
      permissions,
    };
  }
}

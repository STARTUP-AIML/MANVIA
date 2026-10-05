// ==============================================================================
// MANVIA — Authentication Controller
// ==============================================================================
// Phase 4: API Endpoints for Registration, Login, Session Refresh & Revocation
// Route Prefix: /api/v1/auth
// ==============================================================================

import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { AuthService } from './services/auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';
import { TokenRefreshResponseDto } from './dto/token-refresh-response.dto.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { AuthGuard } from './guards/auth.guard.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { Public } from './decorators/public.decorator.js';
import type { AuthenticatedUser, ClientMetadata } from './auth.interface.js';
import { UserService } from '../identity/user.service.js';
import { NotFoundError } from '../../common/errors/app-error.js';
import { RateLimit } from '../../common/guards/rate-limit.decorator.js';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  private extractClientMetadata(req: FastifyRequest): ClientMetadata {
    return {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
      deviceType: req.headers['x-device-type'] as string | undefined,
      deviceName: req.headers['x-device-name'] as string | undefined,
    };
  }

  @Public()
  @RateLimit({ limit: 15, ttlSeconds: 60, scope: 'auth:register', trackBy: 'ip' })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user identity',
    description:
      'Creates a central immutable User identity and isolated password credential atomically.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Registration successful; returns identity and authenticated session tokens.',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed or password complexity policy not satisfied.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'An account with this email address or phone number already exists.',
  })
  public async register(
    @Body() dto: RegisterDto,
    @Req() req: FastifyRequest,
  ): Promise<AuthResponseDto> {
    const metadata = this.extractClientMetadata(req);
    return this.authService.register(dto, metadata);
  }

  @Public()
  @RateLimit({ limit: 10, ttlSeconds: 60, scope: 'auth:login', trackBy: 'ip' })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate with email and password credentials',
    description:
      'Verifies credentials using constant-time Argon2id matching, creates an active session, and issues access & refresh tokens.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Authentication successful; returns session tokens.',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials or inactive account status.',
  })
  public async login(@Body() dto: LoginDto, @Req() req: FastifyRequest): Promise<AuthResponseDto> {
    const metadata = this.extractClientMetadata(req);
    return this.authService.login(dto, metadata);
  }

  @Public()
  @RateLimit({ limit: 30, ttlSeconds: 60, scope: 'auth:refresh', trackBy: 'ip' })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate refresh token and obtain a new access JWT',
    description:
      'Rotates the presented refresh token. Replay of previously used tokens triggers automatic token family revocation (breach mitigation).',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tokens successfully rotated.',
    type: TokenRefreshResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid, expired, or revoked refresh token.',
  })
  public async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: FastifyRequest,
  ): Promise<TokenRefreshResponseDto> {
    const metadata = this.extractClientMetadata(req);
    return this.authService.refresh(dto, metadata);
  }

  @UseGuards(AuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Revoke active authentication session',
    description: 'Explicitly revokes the current session and invalidates its refresh token family.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session successfully revoked.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid authentication token.',
  })
  public async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: FastifyRequest,
  ): Promise<{ message: string }> {
    const metadata = this.extractClientMetadata(req);
    await this.authService.logout(user.sessionId, user.id, metadata);
    return { message: 'Logged out successfully' };
  }

  @UseGuards(AuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Change account password',
    description:
      'Verifies the current password, enforces password complexity, updates password hash, and invalidates existing sessions.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password changed successfully.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'New password does not satisfy complexity requirements.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Current password verification failed.',
  })
  public async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
    @Req() req: FastifyRequest,
  ): Promise<{ message: string }> {
    const metadata = this.extractClientMetadata(req);
    await this.authService.changePassword(userId, dto, metadata);
    return { message: 'Password updated successfully' };
  }

  @UseGuards(AuthGuard)
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Retrieve authenticated user identity context',
    description: 'Returns the sanitized User profile for the authenticated request context.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile retrieved successfully.',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or expired authentication.',
  })
  public async getCurrentUser(
    @CurrentUser() authUser: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    const user = await this.userService.findById(authUser.id);
    if (!user) {
      throw new NotFoundError('User account not found');
    }
    return this.authService.mapToUserResponseDto(user);
  }
}

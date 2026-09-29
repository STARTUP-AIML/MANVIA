// ==============================================================================
// MANVIA — Patient Domain Controller
// ==============================================================================
// Phase 6: Patient Self-Service Profile API
// ==============================================================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.interface.js';
import { RolesGuard } from '../authorization/guards/roles.guard.js';
import { Roles } from '../authorization/decorators/roles.decorator.js';
import { Role } from '@prisma/client';
import { PatientService } from './services/patient.service.js';
import { CreatePatientProfileDto } from './dto/create-patient-profile.dto.js';
import { UpdatePatientProfileDto } from './dto/update-patient-profile.dto.js';
import { PatientProfileResponseDto } from './dto/patient-profile-response.dto.js';

@ApiTags('Patients')
@ApiBearerAuth('JWT')
@Controller({ path: 'patients', version: '1' })
@UseGuards(AuthGuard, RolesGuard)
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.PATIENT, Role.ADMIN)
  @ApiOperation({
    summary: 'Get current authenticated patient profile',
    description:
      'Retrieves the demographic and contact profile of the authenticated patient. Access is scoped to the requesting user only (IDOR protected).',
  })
  @ApiResponse({
    status: 200,
    description: 'Patient profile retrieved successfully',
    type: PatientProfileResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Access denied: insufficient privileges' })
  @ApiNotFoundResponse({ description: 'Patient profile not found' })
  public async getMyProfile(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PatientProfileResponseDto> {
    const profile = await this.patientService.getProfileByUserId(user.id);
    return PatientProfileResponseDto.from(profile);
  }

  @Post('me')
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.PATIENT, Role.ADMIN)
  @ApiOperation({
    summary: 'Initialize current patient profile',
    description:
      'Creates a new PatientProfile for the authenticated user if one does not already exist.',
  })
  @ApiResponse({
    status: 201,
    description: 'Patient profile created successfully',
    type: PatientProfileResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Access denied: insufficient privileges' })
  @ApiConflictResponse({ description: 'Patient profile already exists for this user' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  public async createMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePatientProfileDto,
  ): Promise<PatientProfileResponseDto> {
    const profile = await this.patientService.createProfile(user.id, dto);
    return PatientProfileResponseDto.from(profile);
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.PATIENT, Role.ADMIN)
  @ApiOperation({
    summary: 'Update current authenticated patient profile',
    description:
      'Updates demographic details and contact preferences. System fields and foreign keys cannot be modified (Mass-assignment protected).',
  })
  @ApiResponse({
    status: 200,
    description: 'Patient profile updated successfully',
    type: PatientProfileResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Access denied: insufficient privileges' })
  @ApiNotFoundResponse({ description: 'Patient profile not found' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  public async updateMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePatientProfileDto,
  ): Promise<PatientProfileResponseDto> {
    const updated = await this.patientService.updateProfile(user.id, dto);
    return PatientProfileResponseDto.from(updated);
  }
}

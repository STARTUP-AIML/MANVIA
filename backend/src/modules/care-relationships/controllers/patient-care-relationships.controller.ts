import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PatientAuthGuard } from '../guards/patient-auth.guard.js';
import { CurrentUser } from '../../doctors/decorators/current-user.decorator.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';
import { CareRelationshipsService } from '../services/care-relationships.service.js';
import { CreateCareRelationshipDto } from '../dto/create-care-relationship.dto.js';
import { CareRelationshipResponseDto } from '../dto/care-relationship-response.dto.js';

@ApiTags('Patient Care Relationships')
@Controller('care-relationships')
@UseGuards(PatientAuthGuard)
@ApiBearerAuth('bearer-auth')
export class PatientCareRelationshipsController {
  constructor(private readonly careRelService: CareRelationshipsService) {}

  @Get()
  @ApiOperation({
    summary: 'List care relationships for authenticated patient',
    description:
      'Returns all established and active care relationships between the patient and licensed physicians.',
  })
  @ApiResponse({
    status: 200,
    description: 'Care relationships retrieved successfully',
    type: [CareRelationshipResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Patient role required' })
  public async getSelfCareRelationships(
    @CurrentUser() user: CurrentUserContext,
  ): Promise<CareRelationshipResponseDto[]> {
    return this.careRelService.getPatientCareRelationships(user.userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Establish care relationship with a verified physician',
    description:
      'Creates an active care relationship with a verified physician. Rejects unverified doctors.',
  })
  @ApiResponse({
    status: 201,
    description: 'Care relationship established successfully',
    type: CareRelationshipResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error (e.g. unverified doctor)' })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Patient role required' })
  @ApiResponse({ status: 404, description: 'Doctor not found' })
  @ApiResponse({ status: 409, description: 'Active care relationship already exists' })
  public async createCareRelationship(
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: CreateCareRelationshipDto,
  ): Promise<CareRelationshipResponseDto> {
    return this.careRelService.createCareRelationship(user.userId, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Terminate care relationship',
    description:
      'Terminates an existing care relationship and automatically revokes all associated data access consents.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the care relationship to terminate' })
  @ApiResponse({
    status: 200,
    description: 'Care relationship terminated successfully',
    type: CareRelationshipResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({
    status: 403,
    description: 'Access denied: cannot terminate other patients relationships',
  })
  @ApiResponse({ status: 404, description: 'Care relationship not found' })
  public async terminateCareRelationship(
    @CurrentUser() user: CurrentUserContext,
    @Param('id') id: string,
  ): Promise<CareRelationshipResponseDto> {
    return this.careRelService.terminateCareRelationship(user.userId, id);
  }
}

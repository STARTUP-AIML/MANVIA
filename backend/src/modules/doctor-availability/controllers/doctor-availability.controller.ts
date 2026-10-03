import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DoctorAuthGuard } from '../../doctors/guards/doctor-auth.guard.js';
import { CurrentUser } from '../../doctors/decorators/current-user.decorator.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';
import { DoctorAvailabilityService } from '../services/doctor-availability.service.js';
import { CreateAvailabilityDto } from '../dto/create-availability.dto.js';
import { UpdateAvailabilityDto } from '../dto/update-availability.dto.js';
import { DoctorAvailabilityResponseDto } from '../dto/doctor-availability-response.dto.js';

@ApiTags('Doctor Availability')
@Controller('doctors/me/availability')
@UseGuards(DoctorAuthGuard)
@ApiBearerAuth('bearer-auth')
export class DoctorAvailabilityController {
  constructor(private readonly availabilityService: DoctorAvailabilityService) {}

  @Get()
  @ApiOperation({
    summary: 'List recurring availability schedule for authenticated physician',
    description:
      'Returns all weekly availability rules, time ranges, and timezone definitions configured by the authenticated doctor.',
  })
  @ApiResponse({
    status: 200,
    description: 'Availability rules retrieved successfully',
    type: [DoctorAvailabilityResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Doctor role required' })
  @ApiResponse({ status: 404, description: 'Doctor profile not found' })
  public async getSelfAvailabilities(
    @CurrentUser() user: CurrentUserContext,
  ): Promise<DoctorAvailabilityResponseDto[]> {
    return this.availabilityService.getSelfAvailabilities(user.userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create recurring availability window',
    description:
      'Defines a structured recurring weekly availability rule specifying day of week, start time, end time, and authoritative local IANA timezone.',
  })
  @ApiResponse({
    status: 201,
    description: 'Availability rule created successfully',
    type: DoctorAvailabilityResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation failed on time range or timezone format' })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Doctor role required' })
  @ApiResponse({ status: 409, description: 'Overlapping availability window detected for weekday' })
  public async createAvailability(
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: CreateAvailabilityDto,
  ): Promise<DoctorAvailabilityResponseDto> {
    return this.availabilityService.createAvailability(user.userId, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update existing availability rule',
    description:
      'Modifies time ranges, day of week, or active state of a recurring availability window.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the availability rule to modify' })
  @ApiResponse({
    status: 200,
    description: 'Availability rule updated successfully',
    type: DoctorAvailabilityResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid time range or timezone format' })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Access denied: cannot modify another physician rules' })
  @ApiResponse({ status: 404, description: 'Availability rule not found' })
  @ApiResponse({ status: 409, description: 'Overlapping availability window conflict' })
  public async updateAvailability(
    @CurrentUser() user: CurrentUserContext,
    @Param('id') id: string,
    @Body() dto: UpdateAvailabilityDto,
  ): Promise<DoctorAvailabilityResponseDto> {
    return this.availabilityService.updateAvailability(user.userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete or deactivate availability rule',
    description: 'Removes an availability window from the physician recurring schedule.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the availability rule to delete' })
  @ApiResponse({
    status: 200,
    description: 'Availability rule deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        id: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Access denied: cannot delete another physician rules' })
  @ApiResponse({ status: 404, description: 'Availability rule not found' })
  public async deleteAvailability(
    @CurrentUser() user: CurrentUserContext,
    @Param('id') id: string,
  ): Promise<{ success: boolean; id: string }> {
    return this.availabilityService.deleteAvailability(user.userId, id);
  }
}

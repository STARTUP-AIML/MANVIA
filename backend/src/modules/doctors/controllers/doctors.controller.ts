import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { DoctorsService } from '../services/doctors.service.js';
import { TaxonomyService } from '../services/taxonomy.service.js';
import { DoctorAuthGuard } from '../guards/doctor-auth.guard.js';
import { CurrentUser } from '../decorators/current-user.decorator.js';
import type { CurrentUserContext } from '../interfaces/auth-context.interface.js';
import { CreateDoctorProfileDto } from '../dto/create-doctor-profile.dto.js';
import { UpdateDoctorProfileDto } from '../dto/update-doctor-profile.dto.js';
import { DoctorQueryDto } from '../dto/doctor-query.dto.js';
import { DoctorSelfResponseDto } from '../dto/doctor-self-response.dto.js';
import { DoctorPublicResponseDto } from '../dto/doctor-public-response.dto.js';
import { SpecialtyResponseDto, LanguageResponseDto } from '../dto/taxonomy.dto.js';

@ApiTags('Doctors')
@Controller('doctors')
export class DoctorsController {
  constructor(
    private readonly doctorsService: DoctorsService,
    private readonly taxonomyService: TaxonomyService,
  ) {}

  // ----------------------------------------------------------------------------
  // Doctor Self-Service Endpoints (Authenticated Doctor Only)
  // ----------------------------------------------------------------------------

  @Get('me')
  @UseGuards(DoctorAuthGuard)
  @ApiBearerAuth('bearer-auth')
  @ApiOperation({
    summary: 'Retrieve authenticated doctor profile',
    description:
      'Returns the full private doctor profile for the currently authenticated physician, including licensing and verification status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Doctor profile retrieved successfully',
    type: DoctorSelfResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 403, description: 'Doctor role required' })
  @ApiResponse({ status: 404, description: 'Doctor profile does not exist' })
  public async getSelfProfile(
    @CurrentUser() user: CurrentUserContext,
  ): Promise<DoctorSelfResponseDto> {
    return this.doctorsService.getSelfProfile(user.userId);
  }

  @Post('profile')
  @UseGuards(DoctorAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('bearer-auth')
  @ApiOperation({
    summary: 'Initialize doctor profile for authenticated user',
    description:
      'Creates the initial doctor profile for an authenticated physician account. Generates publicDoctorId and assigns DRAFT verification status.',
  })
  @ApiResponse({
    status: 201,
    description: 'Doctor profile initialized successfully',
    type: DoctorSelfResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 403, description: 'Doctor role required' })
  @ApiResponse({ status: 409, description: 'Doctor profile or registration number conflict' })
  public async createProfile(
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: CreateDoctorProfileDto,
  ): Promise<DoctorSelfResponseDto> {
    return this.doctorsService.initializeProfile(user.userId, dto);
  }

  @Patch('me')
  @UseGuards(DoctorAuthGuard)
  @ApiBearerAuth('bearer-auth')
  @ApiOperation({
    summary: 'Update authenticated doctor profile',
    description:
      'Updates permitted profile fields (display name, bio, experience, consultation fee, specialties, languages, qualifications). Status cannot be modified.',
  })
  @ApiResponse({
    status: 200,
    description: 'Doctor profile updated successfully',
    type: DoctorSelfResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 403, description: 'Doctor role required' })
  @ApiResponse({ status: 404, description: 'Doctor profile not found' })
  public async updateSelfProfile(
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: UpdateDoctorProfileDto,
  ): Promise<DoctorSelfResponseDto> {
    return this.doctorsService.updateSelfProfile(user.userId, dto);
  }

  // ----------------------------------------------------------------------------
  // Taxonomy Endpoints (Public Reference Data)
  // ----------------------------------------------------------------------------

  @Get('specialties')
  @ApiOperation({
    summary: 'List active medical specialties',
    description: 'Returns all standardized clinical specialties available for doctor profiles.',
  })
  @ApiResponse({
    status: 200,
    description: 'Specialties retrieved successfully',
    type: [SpecialtyResponseDto],
  })
  public async getSpecialties(): Promise<SpecialtyResponseDto[]> {
    return this.taxonomyService.getActiveSpecialties();
  }

  @Get('languages')
  @ApiOperation({
    summary: 'List supported languages',
    description: 'Returns all standardized ISO-639-1 languages supported on the platform.',
  })
  @ApiResponse({
    status: 200,
    description: 'Languages retrieved successfully',
    type: [LanguageResponseDto],
  })
  public async getLanguages(): Promise<LanguageResponseDto[]> {
    return this.taxonomyService.getAllLanguages();
  }

  // ----------------------------------------------------------------------------
  // Public Doctor Directory & Search Endpoints
  // ----------------------------------------------------------------------------

  @Get()
  @ApiOperation({
    summary: 'Search public doctor directory',
    description:
      'Searches and paginates publicly visible doctor profiles. Sensitive fields and internal IDs are stripped.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of matching doctor profiles',
    type: [DoctorPublicResponseDto],
  })
  public async searchDoctors(@Query() query: DoctorQueryDto) {
    return this.doctorsService.searchPublicDoctors(query);
  }

  @Get(':doctorId')
  @ApiOperation({
    summary: 'Get public doctor profile by ID',
    description:
      'Retrieves the public profile for a doctor using their publicDoctorId (DOC-XXXXXXXX) or UUID. Strips sensitive credentials.',
  })
  @ApiParam({
    name: 'doctorId',
    description: 'Public Doctor ID (DOC-XXXXXXXX) or internal UUID',
    example: 'DOC-90218471',
  })
  @ApiResponse({
    status: 200,
    description: 'Public doctor profile retrieved successfully',
    type: DoctorPublicResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Doctor not found' })
  public async getDoctorById(
    @Param('doctorId') doctorId: string,
  ): Promise<DoctorPublicResponseDto> {
    return this.doctorsService.getPublicDoctorById(doctorId);
  }
}

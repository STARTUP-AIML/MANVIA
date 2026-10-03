import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DoctorAvailabilityService } from '../services/doctor-availability.service.js';
import { ConsultationOffersService } from '../services/consultation-offers.service.js';
import {
  PatientDoctorAvailabilityResponseDto,
  PatientDoctorOfferResponseDto,
} from '../dto/patient-doctor-discovery.dto.js';

@ApiTags('Patient Discovery')
@Controller('doctors')
export class PublicDoctorDiscoveryController {
  constructor(
    private readonly availabilityService: DoctorAvailabilityService,
    private readonly offersService: ConsultationOffersService,
  ) {}

  @Get(':publicDoctorId/offers')
  @ApiOperation({
    summary: 'Discover active consultation offers for verified physician (Patient-Facing)',
    description:
      'Returns active consultation service offerings and pricing metadata for an authoritative verified doctor. Unverified doctors do not appear as active providers.',
  })
  @ApiParam({
    name: 'publicDoctorId',
    description: 'Public pseudonymous identifier of the physician (e.g. DOC-AB12CD)',
  })
  @ApiResponse({
    status: 200,
    description: 'Active consultation offers retrieved successfully',
    type: [PatientDoctorOfferResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Doctor not found or not an active verified consultation provider',
  })
  public async getDoctorPublicOffers(
    @Param('publicDoctorId') publicDoctorId: string,
  ): Promise<PatientDoctorOfferResponseDto[]> {
    return this.offersService.getDoctorPublicOffers(publicDoctorId);
  }

  @Get(':publicDoctorId/availability')
  @ApiOperation({
    summary: 'Discover recurring availability schedule for verified physician (Patient-Facing)',
    description:
      'Returns recurring active availability windows and local timezone for an authoritative verified doctor. Unverified doctors do not appear as active providers.',
  })
  @ApiParam({
    name: 'publicDoctorId',
    description: 'Public pseudonymous identifier of the physician (e.g. DOC-AB12CD)',
  })
  @ApiResponse({
    status: 200,
    description: 'Active availability rules retrieved successfully',
    type: [PatientDoctorAvailabilityResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Doctor not found or not an active verified consultation provider',
  })
  public async getDoctorPublicAvailabilities(
    @Param('publicDoctorId') publicDoctorId: string,
  ): Promise<PatientDoctorAvailabilityResponseDto[]> {
    return this.availabilityService.getDoctorPublicAvailabilities(publicDoctorId);
  }
}

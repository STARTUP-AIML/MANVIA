import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DoctorAuthGuard } from '../../doctors/guards/doctor-auth.guard.js';
import { CareRelationshipGuard } from '../../care-relationships/guards/care-relationship.guard.js';
import { ConsentGuard } from '../../care-relationships/guards/consent.guard.js';
import { RequireConsent } from '../../care-relationships/decorators/require-consent.decorator.js';
import { ConsentScope } from '../../care-relationships/enums/consent-scope.enum.js';
import { CurrentUser } from '../../doctors/decorators/current-user.decorator.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';
import { HealthRecordsService } from '../services/health-records.service.js';
import { HealthTimelineService } from '../services/health-timeline.service.js';
import {
  DownloadUrlResponseDto,
  HealthRecordQueryDto,
  HealthRecordResponseDto,
  PaginatedHealthRecordsResponseDto,
  PaginatedTimelineResponseDto,
  TimelineQueryDto,
} from '../dto/index.js';

@ApiTags('Doctor Patient Health Records & Timeline')
@Controller('doctors/me/patients/:patientId')
@UseGuards(DoctorAuthGuard, CareRelationshipGuard, ConsentGuard)
@ApiBearerAuth('bearer-auth')
export class DoctorHealthRecordsController {
  constructor(
    private readonly healthRecordsService: HealthRecordsService,
    private readonly healthTimelineService: HealthTimelineService,
  ) {}

  @Get('health-records')
  @RequireConsent(ConsentScope.HEALTH_RECORDS)
  @ApiOperation({
    summary: 'View patient health records (Physician Access)',
    description:
      'Allows a verified physician with an active care relationship and explicit patient consent (HEALTH_RECORDS scope) to view patient documents and records.',
  })
  @ApiParam({
    name: 'patientId',
    description: 'Internal patient profile UUID or public ID (PAT-XXXXXXXX)',
  })
  @ApiResponse({
    status: 200,
    description: 'Patient health records retrieved under valid consent',
    type: PaginatedHealthRecordsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({
    status: 403,
    description:
      'Access denied: requires verified physician, active care relationship, and HEALTH_RECORDS consent',
  })
  @ApiResponse({ status: 404, description: 'Patient resource not found' })
  public async getPatientRecords(
    @CurrentUser() user: CurrentUserContext,
    @Param('patientId') patientId: string,
    @Query() query: HealthRecordQueryDto,
  ): Promise<PaginatedHealthRecordsResponseDto> {
    return this.healthRecordsService.getDoctorPatientRecords(user.userId, patientId, query);
  }

  @Get('health-records/:recordId')
  @RequireConsent(ConsentScope.HEALTH_RECORDS)
  @ApiOperation({
    summary: 'View single patient health record details (Physician Access)',
    description:
      'Allows an authorized physician to view metadata of a specific patient health record.',
  })
  @ApiParam({
    name: 'patientId',
    description: 'Internal patient profile UUID or public ID (PAT-XXXXXXXX)',
  })
  @ApiParam({
    name: 'recordId',
    description: 'Health record internal UUID or public ID (REC-XXXXXXXX)',
  })
  @ApiResponse({
    status: 200,
    description: 'Patient health record details retrieved',
    type: HealthRecordResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Record not found' })
  public async getPatientRecordById(
    @CurrentUser() user: CurrentUserContext,
    @Param('patientId') patientId: string,
    @Param('recordId') recordId: string,
  ): Promise<HealthRecordResponseDto> {
    return this.healthRecordsService.getDoctorPatientRecordById(user.userId, patientId, recordId);
  }

  @Get('health-records/:recordId/download-url')
  @RequireConsent(ConsentScope.HEALTH_RECORDS)
  @ApiOperation({
    summary: 'Request download URL for patient record document (Physician Access)',
    description:
      'Generates a time-limited signed URL for direct document access under patient consent.',
  })
  @ApiParam({
    name: 'patientId',
    description: 'Internal patient profile UUID or public ID (PAT-XXXXXXXX)',
  })
  @ApiParam({
    name: 'recordId',
    description: 'Health record internal UUID or public ID (REC-XXXXXXXX)',
  })
  @ApiResponse({
    status: 200,
    description: 'Temporary signed download URL generated',
    type: DownloadUrlResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Record not found' })
  public async getPatientRecordDownloadUrl(
    @CurrentUser() user: CurrentUserContext,
    @Param('patientId') patientId: string,
    @Param('recordId') recordId: string,
  ): Promise<DownloadUrlResponseDto> {
    return this.healthRecordsService.getDoctorPatientRecordDownloadUrl(
      user.userId,
      patientId,
      recordId,
    );
  }

  @Get('health-timeline')
  @RequireConsent(ConsentScope.HEALTH_TIMELINE)
  @ApiOperation({
    summary: 'View patient longitudinal health timeline (Physician Access)',
    description:
      'Allows a verified physician with an active care relationship and explicit patient consent (HEALTH_TIMELINE scope) to view the longitudinal timeline.',
  })
  @ApiParam({
    name: 'patientId',
    description: 'Internal patient profile UUID or public ID (PAT-XXXXXXXX)',
  })
  @ApiResponse({
    status: 200,
    description: 'Patient timeline retrieved under valid consent',
    type: PaginatedTimelineResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({
    status: 403,
    description:
      'Access denied: requires verified physician, active care relationship, and HEALTH_TIMELINE consent',
  })
  @ApiResponse({ status: 404, description: 'Patient resource not found' })
  public async getPatientTimeline(
    @CurrentUser() user: CurrentUserContext,
    @Param('patientId') patientId: string,
    @Query() query: TimelineQueryDto,
  ): Promise<PaginatedTimelineResponseDto> {
    return this.healthTimelineService.getDoctorPatientTimeline(user.userId, patientId, query);
  }
}

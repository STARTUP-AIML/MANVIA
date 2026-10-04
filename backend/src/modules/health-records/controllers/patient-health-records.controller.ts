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
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

interface FastifyReplyLike {
  header(name: string, value: string): unknown;
  send(payload: unknown): unknown;
}
import { PatientAuthGuard } from '../../care-relationships/guards/patient-auth.guard.js';
import { CurrentUser } from '../../doctors/decorators/current-user.decorator.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';
import { HealthRecordsService } from '../services/health-records.service.js';
import {
  CreateHealthRecordDto,
  CreateUploadIntentDto,
  DownloadUrlResponseDto,
  HealthRecordQueryDto,
  HealthRecordResponseDto,
  PaginatedHealthRecordsResponseDto,
  UpdateHealthRecordDto,
  UploadIntentResponseDto,
} from '../dto/index.js';

@ApiTags('Patient Health Records')
@Controller('health-records')
@UseGuards(PatientAuthGuard)
@ApiBearerAuth('bearer-auth')
export class PatientHealthRecordsController {
  constructor(private readonly healthRecordsService: HealthRecordsService) {}

  @Post('upload-intent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request presigned upload URL for a health record document',
    description:
      'Validates MIME type, maximum 25MB file size limit, and returns a time-limited presigned upload URL and storage key.',
  })
  @ApiResponse({
    status: 200,
    description: 'Upload intent created successfully',
    type: UploadIntentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'File validation failed (MIME type or size boundary)' })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Patient role required' })
  public async createUploadIntent(
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: CreateUploadIntentDto,
  ): Promise<UploadIntentResponseDto> {
    return this.healthRecordsService.createUploadIntent(user.userId, dto);
  }

  @Post(':recordId/finalize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Finalize document upload and transition record to AVAILABLE status',
    description:
      'Confirms the binary object upload, transitions status to AVAILABLE, and records a timeline event.',
  })
  @ApiParam({
    name: 'recordId',
    description: 'Health record internal UUID or public ID (REC-XXXXXXXX)',
  })
  @ApiResponse({
    status: 200,
    description: 'Health record finalized successfully',
    type: HealthRecordResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Patient role required' })
  @ApiResponse({ status: 404, description: 'Health record not found' })
  public async finalizeUpload(
    @CurrentUser() user: CurrentUserContext,
    @Param('recordId') recordId: string,
  ): Promise<HealthRecordResponseDto> {
    return this.healthRecordsService.finalizeUpload(user.userId, recordId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Directly create and index a health record',
    description:
      'Creates a health record with verified metadata and adds a corresponding event to the health timeline.',
  })
  @ApiResponse({
    status: 201,
    description: 'Health record created successfully',
    type: HealthRecordResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Patient role required' })
  public async createRecord(
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: CreateHealthRecordDto,
  ): Promise<HealthRecordResponseDto> {
    return this.healthRecordsService.createRecord(user.userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List health records belonging to authenticated patient',
    description:
      'Retrieves paginated health records with optional filtering by category, status, and date range.',
  })
  @ApiResponse({
    status: 200,
    description: 'Health records retrieved successfully',
    type: PaginatedHealthRecordsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Patient role required' })
  public async listRecords(
    @CurrentUser() user: CurrentUserContext,
    @Query() query: HealthRecordQueryDto,
  ): Promise<PaginatedHealthRecordsResponseDto> {
    return this.healthRecordsService.getPatientRecords(user.userId, query);
  }

  @Get(':recordId')
  @ApiOperation({
    summary: 'Get details of a specific health record',
    description: 'Retrieves health record metadata by internal UUID or public ID (REC-XXXXXXXX).',
  })
  @ApiParam({
    name: 'recordId',
    description: 'Health record internal UUID or public ID (REC-XXXXXXXX)',
  })
  @ApiResponse({
    status: 200,
    description: 'Health record details',
    type: HealthRecordResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Patient role required' })
  @ApiResponse({ status: 404, description: 'Health record not found' })
  public async getRecordById(
    @CurrentUser() user: CurrentUserContext,
    @Param('recordId') recordId: string,
  ): Promise<HealthRecordResponseDto> {
    return this.healthRecordsService.getPatientRecordById(user.userId, recordId);
  }

  @Get(':recordId/download-url')
  @ApiOperation({
    summary: 'Request time-limited signed download URL for record document',
    description:
      'Generates a secure, temporary (5-minute) signed URL for direct retrieval of the record document.',
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
  @ApiResponse({ status: 403, description: 'Patient role required' })
  @ApiResponse({ status: 404, description: 'Health record not found' })
  public async getDownloadUrl(
    @CurrentUser() user: CurrentUserContext,
    @Param('recordId') recordId: string,
  ): Promise<DownloadUrlResponseDto> {
    return this.healthRecordsService.getRecordDownloadUrl(user.userId, recordId);
  }

  @Get(':recordId/download')
  @ApiOperation({
    summary: 'Download health record document binary file',
    description: 'Directly streams the health record binary document with proper Content-Type.',
  })
  @ApiParam({
    name: 'recordId',
    description: 'Health record internal UUID or public ID (REC-XXXXXXXX)',
  })
  @ApiResponse({ status: 200, description: 'Health record binary stream' })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Patient role required' })
  @ApiResponse({ status: 404, description: 'Health record not found' })
  public async downloadRecord(
    @CurrentUser() user: CurrentUserContext,
    @Param('recordId') recordId: string,
    @Res() res: FastifyReplyLike,
  ): Promise<void> {
    const file = await this.healthRecordsService.downloadPatientRecord(user.userId, recordId);
    res.header('Content-Type', file.mimeType);
    res.header('Content-Disposition', `attachment; filename="${file.originalFileName}"`);
    res.send(file.buffer);
  }

  @Patch(':recordId')
  @ApiOperation({
    summary: 'Update health record metadata',
    description: 'Modifies title, description, category, or recordedDate of an existing record.',
  })
  @ApiParam({
    name: 'recordId',
    description: 'Health record internal UUID or public ID (REC-XXXXXXXX)',
  })
  @ApiResponse({
    status: 200,
    description: 'Health record updated successfully',
    type: HealthRecordResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Patient role required' })
  @ApiResponse({ status: 404, description: 'Health record not found' })
  public async updateRecord(
    @CurrentUser() user: CurrentUserContext,
    @Param('recordId') recordId: string,
    @Body() dto: UpdateHealthRecordDto,
  ): Promise<HealthRecordResponseDto> {
    return this.healthRecordsService.updateRecord(user.userId, recordId, dto);
  }

  @Delete(':recordId')
  @ApiOperation({
    summary: 'Soft-delete / archive a health record',
    description:
      'Safely marks a health record as DELETED without permanent physical data destruction.',
  })
  @ApiParam({
    name: 'recordId',
    description: 'Health record internal UUID or public ID (REC-XXXXXXXX)',
  })
  @ApiResponse({
    status: 200,
    description: 'Health record soft-deleted successfully',
    type: HealthRecordResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Patient role required' })
  @ApiResponse({ status: 404, description: 'Health record not found' })
  public async deleteRecord(
    @CurrentUser() user: CurrentUserContext,
    @Param('recordId') recordId: string,
  ): Promise<HealthRecordResponseDto> {
    return this.healthRecordsService.deleteRecord(user.userId, recordId);
  }
}

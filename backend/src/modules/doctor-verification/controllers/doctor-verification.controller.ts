import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DoctorAuthGuard } from '../../doctors/guards/doctor-auth.guard.js';
import { CurrentUser } from '../../doctors/decorators/current-user.decorator.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';
import { DoctorVerificationService } from '../services/doctor-verification.service.js';
import { SubmitVerificationDto } from '../dto/submit-verification.dto.js';
import { UploadVerificationDocumentDto } from '../dto/upload-verification-document.dto.js';
import { DoctorVerificationResponseDto } from '../dto/doctor-verification-response.dto.js';
import { VerificationDocumentResponseDto } from '../dto/verification-document-response.dto.js';

@ApiTags('Doctor Verification')
@Controller('doctors/me/verification')
@UseGuards(DoctorAuthGuard)
@ApiBearerAuth('bearer-auth')
export class DoctorVerificationController {
  constructor(private readonly verificationService: DoctorVerificationService) {}

  @Get()
  @ApiOperation({
    summary: 'Retrieve authenticated doctor verification workflow and status',
    description:
      'Returns the current verification status, submission notes, rejection remediation details (if applicable), and list of uploaded credential documents.',
  })
  @ApiResponse({
    status: 200,
    description: 'Doctor verification details retrieved successfully',
    type: DoctorVerificationResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Doctor role required' })
  @ApiResponse({ status: 404, description: 'Doctor profile not found' })
  public async getSelfVerification(
    @CurrentUser() user: CurrentUserContext,
  ): Promise<DoctorVerificationResponseDto> {
    return this.verificationService.getDoctorVerification(user.userId);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create or update draft verification notes',
    description:
      'Initializes a new draft verification workflow or updates notes on an existing draft.',
  })
  @ApiResponse({
    status: 200,
    description: 'Draft verification saved successfully',
    type: DoctorVerificationResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Doctor role required' })
  @ApiResponse({ status: 409, description: 'Verification is already under review or approved' })
  public async createOrUpdateDraft(
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: SubmitVerificationDto,
  ): Promise<DoctorVerificationResponseDto> {
    return this.verificationService.createOrUpdateDraft(user.userId, dto.notes);
  }

  @Post('documents')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Upload verification credential document',
    description:
      'Uploads and attaches a medical license, degree certificate, or government ID to the active verification draft.',
  })
  @ApiResponse({
    status: 201,
    description: 'Document uploaded and attached successfully',
    type: VerificationDocumentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation failed on document parameters' })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Doctor role required' })
  @ApiResponse({
    status: 409,
    description: 'Cannot upload documents while under review or approved',
  })
  public async uploadDocument(
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: UploadVerificationDocumentDto,
  ): Promise<VerificationDocumentResponseDto> {
    return this.verificationService.uploadDocument(user.userId, dto);
  }

  @Post('submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit verification workflow for administrative review',
    description:
      'Validates all mandatory credentials and documents, transitioning the workflow into PENDING_REVIEW for administrator review.',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification submitted for administrative review',
    type: DoctorVerificationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Missing required registration details or supporting documents',
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Doctor role required' })
  @ApiResponse({ status: 409, description: 'Submission is already pending review or approved' })
  public async submitVerification(
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: SubmitVerificationDto,
  ): Promise<DoctorVerificationResponseDto> {
    return this.verificationService.submitVerification(user.userId, dto);
  }

  @Get('documents/:documentId/access')
  @ApiOperation({
    summary: 'Generate secure temporary download URL for physician own document',
    description:
      'Generates a time-limited signed access URL allowing the authenticated physician to inspect their uploaded document.',
  })
  @ApiParam({ name: 'documentId', description: 'UUID of the verification document' })
  @ApiResponse({
    status: 200,
    description: 'Signed access URL generated successfully',
    schema: {
      type: 'object',
      properties: {
        documentId: { type: 'string' },
        accessUrl: { type: 'string' },
        expiresInSeconds: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({
    status: 403,
    description: 'Access to document denied (belongs to another physician)',
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  public async getDocumentAccessUrl(
    @CurrentUser() user: CurrentUserContext,
    @Param('documentId') documentId: string,
  ): Promise<{ documentId: string; accessUrl: string; expiresInSeconds: number }> {
    return this.verificationService.getDocumentAccessUrl(user.userId, documentId);
  }
}

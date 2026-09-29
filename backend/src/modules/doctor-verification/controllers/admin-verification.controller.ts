import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminAuthGuard } from '../guards/admin-auth.guard.js';
import { CurrentUser } from '../../doctors/decorators/current-user.decorator.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';
import { AdminVerificationService } from '../services/admin-verification.service.js';
import { VerificationQueryDto } from '../dto/verification-query.dto.js';
import { ApproveVerificationDto } from '../dto/approve-verification.dto.js';
import { RejectVerificationDto } from '../dto/reject-verification.dto.js';
import {
  AdminVerificationDetailResponseDto,
  AdminVerificationListResponseDto,
} from '../dto/admin-verification-response.dto.js';

@ApiTags('Admin Doctor Verification')
@Controller('admin/doctor-verifications')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth('bearer-auth')
export class AdminVerificationController {
  constructor(private readonly adminVerificationService: AdminVerificationService) {}

  @Get()
  @ApiOperation({
    summary: 'List doctor verification submissions for review (Admin Only)',
    description:
      'Returns a paginated list of verification submissions with optional status filtering (e.g. PENDING_REVIEW).',
  })
  @ApiResponse({
    status: 200,
    description: 'List of verification submissions retrieved successfully',
    type: AdminVerificationListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Administrator role required' })
  public async listVerifications(
    @Query() query: VerificationQueryDto,
  ): Promise<AdminVerificationListResponseDto> {
    return this.adminVerificationService.listVerifications(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Retrieve verification submission details and audit history (Admin Only)',
    description:
      'Returns full verification data including physician registration information, credential documents, and previous review history.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the verification submission' })
  @ApiResponse({
    status: 200,
    description: 'Verification details retrieved successfully',
    type: AdminVerificationDetailResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Administrator role required' })
  @ApiResponse({ status: 404, description: 'Verification submission not found' })
  public async getVerificationDetails(
    @Param('id') id: string,
  ): Promise<AdminVerificationDetailResponseDto> {
    return this.adminVerificationService.getVerificationDetails(id);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve doctor verification submission (Admin Only)',
    description:
      'Atomically finalizes verification approval, records reviewer identity, preserves review audit record, and updates physician status to VERIFIED.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the verification submission' })
  @ApiResponse({
    status: 200,
    description: 'Verification successfully approved',
    type: AdminVerificationDetailResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Administrator role required' })
  @ApiResponse({ status: 404, description: 'Verification submission not found' })
  @ApiResponse({
    status: 409,
    description: 'Submission is already approved or not in reviewable state',
  })
  public async approveVerification(
    @Param('id') id: string,
    @CurrentUser() adminUser: CurrentUserContext,
    @Body() dto: ApproveVerificationDto,
  ): Promise<AdminVerificationDetailResponseDto> {
    return this.adminVerificationService.approveVerification(id, adminUser.userId, dto);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reject doctor verification submission (Admin Only)',
    description:
      'Atomically records verification rejection with an explicit remediation reason, records reviewer identity, preserves review history, and marks status REJECTED.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the verification submission' })
  @ApiResponse({
    status: 200,
    description: 'Verification successfully rejected with reason',
    type: AdminVerificationDetailResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Rejection reason missing or invalid' })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Administrator role required' })
  @ApiResponse({ status: 404, description: 'Verification submission not found' })
  @ApiResponse({
    status: 409,
    description: 'Submission is already approved, rejected, or not in reviewable state',
  })
  public async rejectVerification(
    @Param('id') id: string,
    @CurrentUser() adminUser: CurrentUserContext,
    @Body() dto: RejectVerificationDto,
  ): Promise<AdminVerificationDetailResponseDto> {
    return this.adminVerificationService.rejectVerification(id, adminUser.userId, dto);
  }

  @Get(':id/documents/:documentId/access')
  @ApiOperation({
    summary: 'Generate secure temporary download URL for reviewer (Admin Only)',
    description:
      'Generates a time-limited signed URL allowing an authorized reviewer to inspect credential documents.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the verification submission' })
  @ApiParam({ name: 'documentId', description: 'UUID of the credential document' })
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
  @ApiResponse({ status: 403, description: 'Administrator role required' })
  @ApiResponse({ status: 404, description: 'Verification submission or document not found' })
  public async getAdminDocumentAccessUrl(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @CurrentUser() adminUser: CurrentUserContext,
  ): Promise<{ documentId: string; accessUrl: string; expiresInSeconds: number }> {
    return this.adminVerificationService.getAdminDocumentAccessUrl(
      id,
      documentId,
      adminUser.userId,
    );
  }
}

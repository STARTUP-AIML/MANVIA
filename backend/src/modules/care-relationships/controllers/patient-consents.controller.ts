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
import { PatientAuthGuard } from '../guards/patient-auth.guard.js';
import { CurrentUser } from '../../doctors/decorators/current-user.decorator.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';
import { ConsentsService } from '../services/consents.service.js';
import { GrantConsentDto } from '../dto/grant-consent.dto.js';
import { RevokeConsentDto } from '../dto/revoke-consent.dto.js';
import { ConsentResponseDto } from '../dto/consent-response.dto.js';
import { ConsentHistoryResponseDto } from '../dto/consent-history-response.dto.js';

@ApiTags('Patient Consents')
@Controller('consents')
@UseGuards(PatientAuthGuard)
@ApiBearerAuth('bearer-auth')
export class PatientConsentsController {
  constructor(private readonly consentsService: ConsentsService) {}

  @Get()
  @ApiOperation({
    summary: 'List consents granted by authenticated patient',
    description:
      'Returns all granted, active, expired, and revoked consent records for the authenticated patient.',
  })
  @ApiResponse({
    status: 200,
    description: 'Consents retrieved successfully',
    type: [ConsentResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Patient role required' })
  public async getSelfConsents(
    @CurrentUser() user: CurrentUserContext,
  ): Promise<ConsentResponseDto[]> {
    return this.consentsService.getPatientConsents(user.userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Grant granular health resource consent to a physician',
    description:
      'Grants explicit, scoped, time-bounded consent to an active verified physician. Automatically verifies or creates the underlying CareRelationship.',
  })
  @ApiResponse({
    status: 201,
    description: 'Consent grants created successfully',
    type: [ConsentResponseDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error (e.g. invalid date or unverified doctor)',
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Patient role required' })
  @ApiResponse({ status: 404, description: 'Doctor not found' })
  @ApiResponse({ status: 409, description: 'Active consent already exists for requested scope' })
  public async grantConsent(
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: GrantConsentDto,
  ): Promise<ConsentResponseDto[]> {
    return this.consentsService.grantConsent(user.userId, dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get consent details and immutable audit history',
    description:
      'Returns the consent grant details alongside its full chronological audit history (grant, updates, revocation).',
  })
  @ApiParam({ name: 'id', description: 'UUID of the consent record' })
  @ApiResponse({
    status: 200,
    description: 'Consent details and audit trail retrieved',
    schema: {
      type: 'object',
      properties: {
        consent: { $ref: '#/components/schemas/ConsentResponseDto' },
        history: {
          type: 'array',
          items: { $ref: '#/components/schemas/ConsentHistoryResponseDto' },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Access denied: cannot view other patients consent' })
  @ApiResponse({ status: 404, description: 'Consent record not found' })
  public async getConsentDetails(
    @CurrentUser() user: CurrentUserContext,
    @Param('id') id: string,
  ): Promise<{ consent: ConsentResponseDto; history: ConsentHistoryResponseDto[] }> {
    return this.consentsService.getConsentDetails(user.userId, id);
  }

  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke active consent grant',
    description:
      'Immediately revokes consent, cutting off physician access to the associated scope. Preserves immutable audit history.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the consent record to revoke' })
  @ApiResponse({
    status: 200,
    description: 'Consent revoked successfully',
    type: ConsentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Consent is already revoked' })
  @ApiResponse({ status: 401, description: 'Authentication credentials required' })
  @ApiResponse({ status: 403, description: 'Access denied: cannot revoke other patients consent' })
  @ApiResponse({ status: 404, description: 'Consent record not found' })
  public async revokeConsent(
    @CurrentUser() user: CurrentUserContext,
    @Param('id') id: string,
    @Body() dto: RevokeConsentDto,
  ): Promise<ConsentResponseDto> {
    return this.consentsService.revokeConsent(user.userId, id, dto);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PatientAuthGuard } from '../../care-relationships/guards/patient-auth.guard.js';
import { CurrentUser } from '../../doctors/decorators/current-user.decorator.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';
import { WaitlistService } from '../services/waitlist.service.js';
import {
  JoinWaitlistDto,
  DeclineOfferDto,
  WaitlistQueryDto,
  WaitlistEntryResponseDto,
  PaginatedWaitlistResponseDto,
} from '../dto/index.js';

@ApiTags('Waitlist (Patient)')
@Controller('waitlist')
@UseGuards(PatientAuthGuard)
@ApiBearerAuth('bearer-auth')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Join waitlist for a healthcare provider',
    description:
      'Places patient into a deterministic priority queue (priority DESC, joinedAt ASC) when appointment slots are unavailable.',
  })
  @ApiResponse({
    status: 201,
    description: 'Patient added to waitlist successfully',
    type: WaitlistEntryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input or unverified doctor' })
  @ApiResponse({ status: 409, description: 'Active waitlist entry already exists' })
  public async joinWaitlist(
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: JoinWaitlistDto,
  ): Promise<WaitlistEntryResponseDto> {
    return this.waitlistService.joinWaitlist(user.userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List waitlist entries for authenticated patient',
    description: 'Returns paginated waitlist entries with queue positions and status filters.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated waitlist entries',
    type: PaginatedWaitlistResponseDto,
  })
  public async getWaitlist(
    @CurrentUser() user: CurrentUserContext,
    @Query() query: WaitlistQueryDto,
  ): Promise<PaginatedWaitlistResponseDto> {
    return this.waitlistService.getPatientWaitlist(user.userId, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get single waitlist entry details',
    description:
      'Retrieves details for a waitlist entry by internal UUID or public ID (WTL-XXXXXXXX).',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal UUID or public waitlist ID (WTL-XXXXXXXX)',
  })
  @ApiResponse({
    status: 200,
    description: 'Waitlist entry retrieved successfully',
    type: WaitlistEntryResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden access to another patient’s entry' })
  @ApiResponse({ status: 404, description: 'Waitlist entry not found' })
  public async getWaitlistEntryById(
    @CurrentUser() user: CurrentUserContext,
    @Param('id') id: string,
  ): Promise<WaitlistEntryResponseDto> {
    return this.waitlistService.getPatientWaitlistEntryById(user.userId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Leave waitlist / cancel waitlist entry',
    description:
      'Transitions waitlist entry to CANCELLED. If a slot was currently offered, releases the temporary slot reservation.',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal UUID or public waitlist ID (WTL-XXXXXXXX)',
  })
  @ApiResponse({
    status: 200,
    description: 'Waitlist entry cancelled successfully',
    type: WaitlistEntryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Waitlist entry not found' })
  public async leaveWaitlist(
    @CurrentUser() user: CurrentUserContext,
    @Param('id') id: string,
  ): Promise<WaitlistEntryResponseDto> {
    return this.waitlistService.leaveWaitlist(user.userId, id);
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Accept an offered waitlist slot',
    description:
      'Accepts an offered slot, confirms the reserved appointment, and marks the waitlist entry as FULFILLED.',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal UUID or public waitlist ID (WTL-XXXXXXXX)',
  })
  @ApiResponse({
    status: 200,
    description: 'Waitlist slot offer accepted and appointment confirmed',
    type: WaitlistEntryResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Offer expired or entry not in OFFERED state' })
  public async acceptOffer(
    @CurrentUser() user: CurrentUserContext,
    @Param('id') id: string,
  ): Promise<WaitlistEntryResponseDto> {
    return this.waitlistService.acceptOffer(user.userId, id);
  }

  @Post(':id/decline')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Decline an offered waitlist slot',
    description:
      'Declines the offered slot, releases the temporary reservation back to AVAILABLE, and automatically triggers allocation for the next eligible candidate in the queue.',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal UUID or public waitlist ID (WTL-XXXXXXXX)',
  })
  @ApiResponse({
    status: 200,
    description: 'Waitlist slot offer declined',
    type: WaitlistEntryResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Entry not in OFFERED state' })
  public async declineOffer(
    @CurrentUser() user: CurrentUserContext,
    @Param('id') id: string,
    @Body() dto: DeclineOfferDto,
  ): Promise<WaitlistEntryResponseDto> {
    return this.waitlistService.declineOffer(user.userId, id, dto);
  }
}

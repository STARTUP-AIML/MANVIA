import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DoctorAuthGuard } from '../../doctors/guards/doctor-auth.guard.js';
import { CurrentUser } from '../../doctors/decorators/current-user.decorator.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';
import { WaitlistService } from '../services/waitlist.service.js';
import { WaitlistQueryDto, PaginatedWaitlistResponseDto } from '../dto/index.js';

@ApiTags('Waitlist (Doctor)')
@Controller('doctor/waitlist')
@UseGuards(DoctorAuthGuard)
@ApiBearerAuth('bearer-auth')
export class DoctorWaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Get()
  @ApiOperation({
    summary: 'List waitlist entries for authenticated physician',
    description:
      'Returns paginated waitlist entries assigned to the doctor with priority and status filters.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated doctor waitlist entries',
    type: PaginatedWaitlistResponseDto,
  })
  public async getDoctorWaitlist(
    @CurrentUser() user: CurrentUserContext,
    @Query() query: WaitlistQueryDto,
  ): Promise<PaginatedWaitlistResponseDto> {
    return this.waitlistService.getDoctorWaitlist(user.userId, query);
  }
}

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
import { DoctorAuthGuard } from '../../doctors/guards/doctor-auth.guard.js';
import { CurrentUser } from '../../doctors/decorators/current-user.decorator.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';
import { AppointmentsService } from '../services/appointments.service.js';
import { PreConsultationService } from '../services/pre-consultation.service.js';
import {
  AppointmentQueryDto,
  AppointmentResponseDto,
  CancelAppointmentDto,
  DeclineAppointmentDto,
  PaginatedAppointmentsResponseDto,
  PreConsultationResponseDto,
} from '../dto/index.js';

@ApiTags('Appointments (Doctor)')
@Controller('doctor/appointments')
@UseGuards(DoctorAuthGuard)
@ApiBearerAuth('bearer-auth')
export class DoctorAppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly preConsultationService: PreConsultationService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List assigned appointments for the authenticated physician',
    description:
      'Returns a deterministic paginated list of appointments assigned to the physician with status and date filters.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of assigned appointments',
    type: PaginatedAppointmentsResponseDto,
  })
  public async getAppointments(
    @CurrentUser() user: CurrentUserContext,
    @Query() query: AppointmentQueryDto,
  ): Promise<PaginatedAppointmentsResponseDto> {
    return this.appointmentsService.getDoctorAppointments(user.userId, query);
  }

  @Get(':appointmentId')
  @ApiOperation({
    summary: 'Get assigned appointment details',
    description:
      'Retrieves single appointment details. Strictly restricted to the assigned physician.',
  })
  @ApiParam({
    name: 'appointmentId',
    description: 'Internal appointment UUID or public ID (APT-XXXXXXXX)',
  })
  @ApiResponse({
    status: 200,
    description: 'Appointment retrieved successfully',
    type: AppointmentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Appointment not found or not assigned to physician' })
  public async getAppointmentById(
    @CurrentUser() user: CurrentUserContext,
    @Param('appointmentId') appointmentId: string,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentsService.getDoctorAppointmentById(user.userId, appointmentId);
  }

  @Post(':appointmentId/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Accept and confirm an appointment request',
    description:
      'Transitions appointment from REQUESTED to CONFIRMED state. Only the assigned physician can confirm.',
  })
  @ApiParam({
    name: 'appointmentId',
    description: 'Internal appointment UUID or public ID (APT-XXXXXXXX)',
  })
  @ApiResponse({
    status: 200,
    description: 'Appointment confirmed successfully',
    type: AppointmentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid transition' })
  @ApiResponse({ status: 404, description: 'Appointment not found or not assigned to physician' })
  public async acceptAppointment(
    @CurrentUser() user: CurrentUserContext,
    @Param('appointmentId') appointmentId: string,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentsService.acceptDoctorAppointment(user.userId, appointmentId);
  }

  @Post(':appointmentId/decline')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Decline an appointment request',
    description:
      'Transitions appointment to DECLINED state and releases the reserved slot back to AVAILABLE.',
  })
  @ApiParam({
    name: 'appointmentId',
    description: 'Internal appointment UUID or public ID (APT-XXXXXXXX)',
  })
  @ApiResponse({
    status: 200,
    description: 'Appointment declined and slot released',
    type: AppointmentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid transition or reason missing' })
  @ApiResponse({ status: 404, description: 'Appointment not found or not assigned to physician' })
  public async declineAppointment(
    @CurrentUser() user: CurrentUserContext,
    @Param('appointmentId') appointmentId: string,
    @Body() dto: DeclineAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentsService.declineDoctorAppointment(user.userId, appointmentId, dto);
  }

  @Post(':appointmentId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel an appointment as a physician',
    description:
      'Transitions confirmed appointment to CANCELLED state and releases the reserved slot.',
  })
  @ApiParam({
    name: 'appointmentId',
    description: 'Internal appointment UUID or public ID (APT-XXXXXXXX)',
  })
  @ApiResponse({
    status: 200,
    description: 'Appointment cancelled and slot released',
    type: AppointmentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid transition or reason missing' })
  @ApiResponse({ status: 404, description: 'Appointment not found or not assigned to physician' })
  public async cancelAppointment(
    @CurrentUser() user: CurrentUserContext,
    @Param('appointmentId') appointmentId: string,
    @Body() dto: CancelAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentsService.cancelDoctorAppointment(user.userId, appointmentId, dto);
  }

  @Post(':appointmentId/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Start consultation session',
    description: 'Transitions appointment status from CONFIRMED to IN_PROGRESS.',
  })
  @ApiParam({
    name: 'appointmentId',
    description: 'Internal appointment UUID or public ID (APT-XXXXXXXX)',
  })
  @ApiResponse({
    status: 200,
    description: 'Appointment marked as IN_PROGRESS',
    type: AppointmentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid transition' })
  public async startAppointment(
    @CurrentUser() user: CurrentUserContext,
    @Param('appointmentId') appointmentId: string,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentsService.startDoctorAppointment(user.userId, appointmentId);
  }

  @Post(':appointmentId/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Conclude consultation session',
    description: 'Transitions appointment status from IN_PROGRESS to COMPLETED.',
  })
  @ApiParam({
    name: 'appointmentId',
    description: 'Internal appointment UUID or public ID (APT-XXXXXXXX)',
  })
  @ApiResponse({
    status: 200,
    description: 'Appointment marked as COMPLETED',
    type: AppointmentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid transition' })
  public async completeAppointment(
    @CurrentUser() user: CurrentUserContext,
    @Param('appointmentId') appointmentId: string,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentsService.completeDoctorAppointment(user.userId, appointmentId);
  }

  @Post(':appointmentId/no-show')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Record patient no-show',
    description: 'Transitions confirmed appointment to NO_SHOW state.',
  })
  @ApiParam({
    name: 'appointmentId',
    description: 'Internal appointment UUID or public ID (APT-XXXXXXXX)',
  })
  @ApiResponse({
    status: 200,
    description: 'Appointment marked as NO_SHOW',
    type: AppointmentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid transition' })
  public async markNoShow(
    @CurrentUser() user: CurrentUserContext,
    @Param('appointmentId') appointmentId: string,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentsService.markNoShowDoctorAppointment(user.userId, appointmentId);
  }

  @Get(':appointmentId/pre-consultation')
  @ApiOperation({
    summary: 'View submitted pre-consultation intake form (Physician Access)',
    description:
      'Retrieves submitted patient intake details for the assigned appointment. Unsubmitted drafts cannot be accessed.',
  })
  @ApiParam({
    name: 'appointmentId',
    description: 'Internal appointment UUID or public ID (APT-XXXXXXXX)',
  })
  @ApiResponse({
    status: 200,
    description: 'Submitted pre-consultation intake details',
    type: PreConsultationResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Pre-consultation has not yet been submitted by the patient',
  })
  @ApiResponse({ status: 404, description: 'Appointment not found or not assigned to physician' })
  public async getPreConsultation(
    @CurrentUser() user: CurrentUserContext,
    @Param('appointmentId') appointmentId: string,
  ): Promise<PreConsultationResponseDto> {
    return this.preConsultationService.getPreConsultationForDoctor(user.userId, appointmentId);
  }
}

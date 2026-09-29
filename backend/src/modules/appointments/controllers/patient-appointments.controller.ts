import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PatientAuthGuard } from '../../care-relationships/guards/patient-auth.guard.js';
import { CurrentUser } from '../../doctors/decorators/current-user.decorator.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';
import { AppointmentsService } from '../services/appointments.service.js';
import { PreConsultationService } from '../services/pre-consultation.service.js';
import {
  AppointmentQueryDto,
  AppointmentResponseDto,
  CancelAppointmentDto,
  CreateAppointmentDto,
  PaginatedAppointmentsResponseDto,
  PreConsultationDraftDto,
  PreConsultationResponseDto,
  ReserveSlotDto,
} from '../dto/index.js';

@ApiTags('Appointments (Patient)')
@Controller('appointments')
@UseGuards(PatientAuthGuard)
@ApiBearerAuth('bearer-auth')
export class PatientAppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly preConsultationService: PreConsultationService,
  ) {}

  @Post('reserve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Temporarily hold an available doctor slot',
    description:
      'Atomically reserves a 15-minute slot window prior to final confirmation. Prevents double-booking race conditions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Slot successfully reserved in HELD_IN_RESERVATION state',
    type: AppointmentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation failed or unverified doctor' })
  @ApiResponse({ status: 404, description: 'Doctor or consultation offer not found' })
  @ApiResponse({ status: 409, description: 'Slot already reserved or active appointment exists' })
  public async reserveSlot(
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: ReserveSlotDto,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentsService.reserveSlot(user.userId, dto);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Request a consultation appointment with a physician',
    description:
      'Creates a new consultation appointment in REQUESTED state. Validates physician verification status, active consultation offer, slot availability, and optional pre-consultation draft.',
  })
  @ApiResponse({
    status: 201,
    description: 'Appointment successfully requested',
    type: AppointmentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid appointment parameters or ineligible physician',
  })
  @ApiResponse({ status: 404, description: 'Doctor or consultation offer not found' })
  @ApiResponse({ status: 409, description: 'Slot already booked or reserved by another patient' })
  public async createAppointment(
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: CreateAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentsService.createAppointment(user.userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List appointments for authenticated patient',
    description:
      'Returns a deterministic paginated list of appointments with support for upcoming, past, and status filtering.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of patient appointments',
    type: PaginatedAppointmentsResponseDto,
  })
  public async getAppointments(
    @CurrentUser() user: CurrentUserContext,
    @Query() query: AppointmentQueryDto,
  ): Promise<PaginatedAppointmentsResponseDto> {
    return this.appointmentsService.getPatientAppointments(user.userId, query);
  }

  @Get(':appointmentId')
  @ApiOperation({
    summary: 'Get single appointment details',
    description: 'Retrieves a single appointment by internal UUID or public ID (APT-XXXXXXXX).',
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
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  public async getAppointmentById(
    @CurrentUser() user: CurrentUserContext,
    @Param('appointmentId') appointmentId: string,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentsService.getPatientAppointmentById(user.userId, appointmentId);
  }

  @Post(':appointmentId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel an appointment as a patient',
    description:
      'Transitions appointment to CANCELLED state and releases the reserved slot back to AVAILABLE.',
  })
  @ApiParam({
    name: 'appointmentId',
    description: 'Internal appointment UUID or public ID (APT-XXXXXXXX)',
  })
  @ApiResponse({
    status: 200,
    description: 'Appointment cancelled successfully and slot released',
    type: AppointmentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid transition or reason missing' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  public async cancelAppointment(
    @CurrentUser() user: CurrentUserContext,
    @Param('appointmentId') appointmentId: string,
    @Body() dto: CancelAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentsService.cancelPatientAppointment(user.userId, appointmentId, dto);
  }

  // --- Pre-Consultation Intake Endpoints ---

  @Get(':appointmentId/pre-consultation')
  @ApiOperation({
    summary: 'View pre-consultation intake form (Patient)',
    description:
      'Retrieves pre-consultation clinical intake details for the specified appointment.',
  })
  @ApiParam({
    name: 'appointmentId',
    description: 'Internal appointment UUID or public ID (APT-XXXXXXXX)',
  })
  @ApiResponse({
    status: 200,
    description: 'Pre-consultation intake details retrieved',
    type: PreConsultationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  public async getPreConsultation(
    @CurrentUser() user: CurrentUserContext,
    @Param('appointmentId') appointmentId: string,
  ): Promise<PreConsultationResponseDto> {
    return this.preConsultationService.getPreConsultationForPatient(user.userId, appointmentId);
  }

  @Post(':appointmentId/pre-consultation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Save or update pre-consultation intake draft',
    description:
      'Creates or updates editable intake draft information (reason for visit, symptoms, medications, allergies, notes).',
  })
  @ApiParam({
    name: 'appointmentId',
    description: 'Internal appointment UUID or public ID (APT-XXXXXXXX)',
  })
  @ApiResponse({
    status: 200,
    description: 'Intake draft saved successfully',
    type: PreConsultationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation failed or appointment is inactive' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  @ApiResponse({
    status: 409,
    description: 'Intake is already submitted and locked against changes',
  })
  public async saveDraft(
    @CurrentUser() user: CurrentUserContext,
    @Param('appointmentId') appointmentId: string,
    @Body() dto: PreConsultationDraftDto,
  ): Promise<PreConsultationResponseDto> {
    return this.preConsultationService.saveDraft(user.userId, appointmentId, dto);
  }

  @Patch(':appointmentId/pre-consultation')
  @ApiOperation({
    summary: 'Patch pre-consultation intake draft',
    description: 'Alias for updating draft intake fields.',
  })
  @ApiParam({
    name: 'appointmentId',
    description: 'Internal appointment UUID or public ID (APT-XXXXXXXX)',
  })
  @ApiResponse({
    status: 200,
    description: 'Intake draft updated successfully',
    type: PreConsultationResponseDto,
  })
  public async patchDraft(
    @CurrentUser() user: CurrentUserContext,
    @Param('appointmentId') appointmentId: string,
    @Body() dto: PreConsultationDraftDto,
  ): Promise<PreConsultationResponseDto> {
    return this.preConsultationService.saveDraft(user.userId, appointmentId, dto);
  }

  @Post(':appointmentId/pre-consultation/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit and lock pre-consultation intake',
    description:
      'Finalizes and locks pre-consultation intake. After submission, answers become immutable.',
  })
  @ApiParam({
    name: 'appointmentId',
    description: 'Internal appointment UUID or public ID (APT-XXXXXXXX)',
  })
  @ApiResponse({
    status: 200,
    description: 'Pre-consultation intake finalized and locked',
    type: PreConsultationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Required fields missing or appointment inactive' })
  @ApiResponse({ status: 404, description: 'Appointment or draft not found' })
  @ApiResponse({ status: 409, description: 'Pre-consultation is already submitted' })
  public async submitPreConsultation(
    @CurrentUser() user: CurrentUserContext,
    @Param('appointmentId') appointmentId: string,
  ): Promise<PreConsultationResponseDto> {
    return this.preConsultationService.submitPreConsultation(user.userId, appointmentId);
  }
}

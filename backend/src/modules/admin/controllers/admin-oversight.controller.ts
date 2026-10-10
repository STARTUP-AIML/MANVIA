import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Optional,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminAuthGuard } from '../guards/admin-auth.guard.js';
import { AdminUser } from '../decorators/admin-user.decorator.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';
import { AdminOversightService } from '../services/admin-oversight.service.js';
import { AdminAppointmentQueryDto } from '../dto/admin-appointment-query.dto.js';
import { AdminCareRelationshipQueryDto } from '../dto/admin-care-relationship-query.dto.js';
import { AdminPaymentQueryDto } from '../dto/admin-payment-query.dto.js';
import { AppointmentsService } from '../../appointments/services/appointments.service.js';
import { CancelAppointmentDto } from '../../appointments/dto/cancel-appointment.dto.js';
import { ConflictError } from '../../../common/errors/app-error.js';

@ApiTags('Admin Oversight & Governance')
@Controller('admin')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth('bearer-auth')
export class AdminOversightController {
  constructor(
    private readonly adminOversightService: AdminOversightService,
    @Optional() private readonly appointmentsService?: AppointmentsService,
  ) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Platform overview metrics & operational dashboard (Admin Only)',
    description:
      'Aggregates users by role, verification queue counts, appointment lifecycle metrics, financial snapshot, and operational alerts.',
  })
  @ApiResponse({ status: 200, description: 'Overview metrics retrieved successfully' })
  public async getDashboardOverview() {
    return this.adminOversightService.getDashboardOverview();
  }

  @Get('patients')
  @ApiOperation({
    summary: 'List patient accounts with administrative pagination and search (Admin Only)',
    description: 'Returns patient directory with public IDs and user email linkage.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Patients list retrieved successfully' })
  public async listPatients(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    const params: { page?: number; limit?: number; search?: string } = {};
    if (page !== undefined) params.page = Number(page);
    if (limit !== undefined) params.limit = Number(limit);
    if (search !== undefined) params.search = String(search);
    return this.adminOversightService.listPatients(params);
  }

  @Get('doctors')
  @ApiOperation({
    summary: 'List doctor accounts and credential verification status (Admin Only)',
    description: 'Returns doctor directory with licensing council and verification status.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'specialty', required: false, type: String })
  @ApiQuery({ name: 'verificationStatus', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Doctors list retrieved successfully' })
  public async listDoctors(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('specialty') specialty?: string,
    @Query('verificationStatus') verificationStatus?: string,
    @Query('search') search?: string,
  ) {
    const params: {
      page?: number;
      limit?: number;
      specialty?: string;
      verificationStatus?: string;
      search?: string;
    } = {};
    if (page !== undefined) params.page = Number(page);
    if (limit !== undefined) params.limit = Number(limit);
    if (specialty !== undefined) params.specialty = String(specialty);
    if (verificationStatus !== undefined) params.verificationStatus = String(verificationStatus);
    if (search !== undefined) params.search = String(search);
    return this.adminOversightService.listDoctors(params);
  }

  @Get('appointments')
  @ApiOperation({
    summary: 'System-wide appointment schedule oversight (Admin Only)',
    description:
      'Monitor appointment statuses, doctors, and scheduling times across the entire platform.',
  })
  @ApiResponse({ status: 200, description: 'Appointments list retrieved successfully' })
  public async listAppointments(@Query() query: AdminAppointmentQueryDto) {
    return this.adminOversightService.listAppointments(query);
  }

  @Get('appointments/:appointmentId')
  @ApiOperation({
    summary: 'Retrieve detailed administrative appointment record (Admin Only)',
    description:
      'Returns appointment metadata, scheduling timestamps, lifecycle milestones, and cancellation details without clinical records.',
  })
  @ApiParam({ name: 'appointmentId', description: 'Appointment UUID or APT-XXXX public ID' })
  @ApiResponse({ status: 200, description: 'Appointment details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  public async getAppointmentDetails(@Param('appointmentId') appointmentId: string) {
    return this.adminOversightService.getAppointmentDetails(appointmentId);
  }

  @Post('appointments/:appointmentId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Administrative appointment cancellation with refund processing (Admin Only)',
    description:
      'Enforces state machine transition, computes refunds according to policy, updates reservation state, and logs an immutable audit event.',
  })
  @ApiParam({ name: 'appointmentId', description: 'Appointment UUID or APT-XXXX public ID' })
  @ApiResponse({ status: 200, description: 'Appointment cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Appointment not found' })
  @ApiResponse({ status: 409, description: 'Invalid state transition' })
  public async cancelAppointment(
    @Param('appointmentId') appointmentId: string,
    @Body() dto: CancelAppointmentDto,
    @AdminUser() adminUser: CurrentUserContext,
  ) {
    if (!this.appointmentsService) {
      throw new ConflictError('Appointment service is not configured');
    }
    return this.appointmentsService.cancelAdminAppointment(adminUser.userId, appointmentId, dto);
  }

  @Get('care-relationships')
  @ApiOperation({
    summary: 'System-wide care relationship oversight (Admin Only)',
    description:
      'Audit care relationship bonds and active consent counts without exposing raw medical records.',
  })
  @ApiResponse({ status: 200, description: 'Care relationships retrieved successfully' })
  public async listCareRelationships(@Query() query: AdminCareRelationshipQueryDto) {
    return this.adminOversightService.listCareRelationships(query);
  }

  @Get('payments/overview')
  @ApiOperation({
    summary: 'Financial and billing oversight overview (Admin Only)',
    description:
      'Reconciliation summary including succeeded revenue, pending payouts, and pending refund claims.',
  })
  @ApiResponse({ status: 200, description: 'Financial overview retrieved successfully' })
  public async getPaymentsOverview(@Query() query: AdminPaymentQueryDto) {
    return this.adminOversightService.getPaymentsOverview(query);
  }

  @Get('notifications/overview')
  @ApiOperation({
    summary: 'Platform notification dispatch metrics (Admin Only)',
    description: 'Aggregated delivery statistics for SMS, email, and push notification channels.',
  })
  @ApiResponse({ status: 200, description: 'Notification overview retrieved successfully' })
  public async getNotificationsOverview() {
    return this.adminOversightService.getNotificationsOverview();
  }
}

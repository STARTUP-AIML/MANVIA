import { Injectable, Optional } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service.js';
import { NotFoundError } from '../../../common/errors/app-error.js';
import type { AdminAppointmentQueryDto } from '../dto/admin-appointment-query.dto.js';
import type { AdminCareRelationshipQueryDto } from '../dto/admin-care-relationship-query.dto.js';
import type { AdminPaymentQueryDto } from '../dto/admin-payment-query.dto.js';
import { SystemKillSwitchService } from './system-kill-switch.service.js';

@Injectable()
export class AdminOversightService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly killSwitchService?: SystemKillSwitchService,
  ) {}

  public async listPatients(query: { page?: number; limit?: number; search?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PatientProfileWhereInput = {};

    if (query.search) {
      where.OR = [
        { publicPatientId: { contains: query.search, mode: 'insensitive' } },
        { displayName: { contains: query.search, mode: 'insensitive' } },
        { legalLastName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.patientProfile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          publicPatientId: true,
          displayName: true,
          gender: true,
          biologicalSex: true,
          bloodGroup: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              email: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.patientProfile.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  public async listDoctors(query: {
    page?: number;
    limit?: number;
    specialty?: string;
    verificationStatus?: string;
    search?: string;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.DoctorProfileWhereInput = {};

    if (query.specialty) {
      where.specialties = {
        some: {
          specialty: {
            name: { contains: query.specialty, mode: 'insensitive' },
          },
        },
      };
    }
    if (query.verificationStatus) {
      where.verificationStatus = query.verificationStatus as never;
    }
    if (query.search) {
      where.OR = [
        { publicDoctorId: { contains: query.search, mode: 'insensitive' } },
        { displayName: { contains: query.search, mode: 'insensitive' } },
        { medicalRegistrationNumber: { contains: query.search, mode: 'insensitive' } },
        { clinicName: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.doctorProfile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          publicDoctorId: true,
          displayName: true,
          medicalRegistrationNumber: true,
          licensingCouncil: true,
          verificationStatus: true,
          yearsOfExperience: true,
          clinicName: true,
          city: true,
          state: true,
          contactDisplay: true,
          isDemo: true,
          createdAt: true,
          specialties: {
            select: {
              isPrimary: true,
              specialty: {
                select: {
                  name: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.doctorProfile.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  public async listAppointments(query: AdminAppointmentQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AppointmentWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.doctorId) {
      where.doctorId = query.doctorId;
    }
    if (query.patientId) {
      where.patientId = query.patientId;
    }
    if (query.startDate || query.endDate) {
      where.startAt = {};
      if (query.startDate) {
        where.startAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.startAt.lte = new Date(query.endDate);
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        orderBy: { startAt: 'desc' },
        skip,
        take: limit,
        include: {
          patient: {
            select: {
              id: true,
              publicPatientId: true,
              displayName: true,
            },
          },
          doctor: {
            select: {
              id: true,
              publicDoctorId: true,
              displayName: true,
            },
          },
        },
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  public async listCareRelationships(query: AdminCareRelationshipQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CareRelationshipWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.doctorId) {
      where.doctorId = query.doctorId;
    }
    if (query.patientId) {
      where.patientId = query.patientId;
    }

    const [items, total] = await Promise.all([
      this.prisma.careRelationship.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          patient: {
            select: {
              id: true,
              publicPatientId: true,
              displayName: true,
            },
          },
          doctor: {
            select: {
              id: true,
              publicDoctorId: true,
              displayName: true,
            },
          },
          _count: {
            select: {
              consents: true,
            },
          },
        },
      }),
      this.prisma.careRelationship.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  public async getPaymentsOverview(query: AdminPaymentQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.userId) {
      where.patient = { userId: query.userId };
    }
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    const [payments, totalPayments, succeededAgg, pendingRefunds, pendingPayouts] =
      await Promise.all([
        this.prisma.payment.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            invoices: {
              select: {
                id: true,
                invoiceNumber: true,
                status: true,
              },
            },
          },
        }),
        this.prisma.payment.count({ where }),
        this.prisma.payment.aggregate({
          where: { status: 'SUCCEEDED' },
          _sum: { amount: true },
          _count: true,
        }),
        this.prisma.refund.count({
          where: { status: 'REQUESTED' },
        }),
        this.prisma.doctorPayout.count({
          where: { status: 'PENDING' },
        }),
      ]);

    return {
      payments,
      total: totalPayments,
      page,
      limit,
      totalPages: Math.ceil(totalPayments / limit) || 1,
      metrics: {
        totalSucceededRevenue: succeededAgg._sum.amount ?? 0,
        totalSucceededTransactions: succeededAgg._count,
        pendingRefundsCount: pendingRefunds,
        pendingPayoutsCount: pendingPayouts,
      },
    };
  }

  public async getNotificationsOverview() {
    const [pending, sent, failed, delivered, totalDevices] = await Promise.all([
      this.prisma.notificationDelivery.count({ where: { status: 'PENDING' } }),
      this.prisma.notificationDelivery.count({ where: { status: 'SENT' } }),
      this.prisma.notificationDelivery.count({ where: { status: 'FAILED' } }),
      this.prisma.notificationDelivery.count({ where: { status: 'DELIVERED' } }),
      this.prisma.notificationDevice.count({ where: { active: true } }),
    ]);

    return {
      deliveries: {
        pending,
        sent,
        failed,
        delivered,
        totalDeliveries: pending + sent + failed + delivered,
      },
      activeDevices: totalDevices,
      timestamp: new Date().toISOString(),
    };
  }

  public async getDashboardOverview() {
    const [
      totalUsers,
      patientCount,
      doctorCount,
      adminCount,
      activeUsers,
      suspendedUsers,
      verificationGroups,
      appointmentGroups,
      paymentsSummary,
      recentAuditLogs,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { roles: { has: 'PATIENT' } } }),
      this.prisma.user.count({ where: { roles: { has: 'DOCTOR' } } }),
      this.prisma.user.count({ where: { roles: { has: 'ADMIN' } } }),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { status: 'SUSPENDED' } }),
      this.prisma.doctorProfile.groupBy({
        by: ['verificationStatus'],
        _count: { _all: true },
      }),
      this.prisma.appointment.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.getPaymentsOverview({ limit: 1 }).catch(() => null),
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          action: true,
          resourceType: true,
          resourceId: true,
          actorUserId: true,
          status: true,
          createdAt: true,
          ipAddress: true,
        },
      }),
    ]);

    const doctorVerificationCounts: Record<string, number> = {
      PENDING_REVIEW: 0,
      VERIFIED: 0,
      REJECTED: 0,
      DRAFT: 0,
      SUSPENDED: 0,
    };
    let totalDoctors = 0;
    for (const group of verificationGroups) {
      const key = group.verificationStatus as string;
      const cnt = group._count._all;
      doctorVerificationCounts[key] = cnt;
      totalDoctors += cnt;
    }

    const appointmentStatusCounts: Record<string, number> = {
      RESERVED: 0,
      REQUESTED: 0,
      CONFIRMED: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      DECLINED: 0,
      EXPIRED: 0,
      NO_SHOW: 0,
    };
    let totalAppointments = 0;
    for (const group of appointmentGroups) {
      const key = group.status as string;
      const cnt = group._count._all;
      appointmentStatusCounts[key] = cnt;
      totalAppointments += cnt;
    }

    const systemStatus = this.killSwitchService ? this.killSwitchService.getSystemStatus() : null;
    const alerts: Array<{ id: string; type: 'WARNING' | 'CRITICAL' | 'INFO'; message: string }> =
      [];

    const pendingVerifsCount = doctorVerificationCounts.PENDING_REVIEW ?? 0;
    if (pendingVerifsCount > 0) {
      alerts.push({
        id: 'pending-verifications',
        type: 'WARNING',
        message: `${pendingVerifsCount} practitioner verification submission(s) awaiting clinical vetting.`,
      });
    }

    if (systemStatus?.subsystems) {
      const disabledSubsystems = systemStatus.subsystems.filter((s) => !s.enabled);
      if (disabledSubsystems.length > 0) {
        alerts.push({
          id: 'kill-switch-active',
          type: 'CRITICAL',
          message: `Emergency Kill Switch engaged on: ${disabledSubsystems.map((s) => s.subsystem).join(', ')}.`,
        });
      }
    }

    return {
      users: {
        total: totalUsers,
        byRole: {
          PATIENT: patientCount,
          DOCTOR: doctorCount,
          ADMIN: adminCount,
        },
        byStatus: {
          ACTIVE: activeUsers,
          SUSPENDED: suspendedUsers,
        },
      },
      doctorVerifications: {
        total: totalDoctors,
        byStatus: doctorVerificationCounts,
        pendingReviewCount: doctorVerificationCounts.PENDING_REVIEW ?? 0,
      },
      appointments: {
        total: totalAppointments,
        byStatus: appointmentStatusCounts,
      },
      finances: paymentsSummary?.metrics ?? {
        totalSucceededRevenue: 0,
        totalSucceededTransactions: 0,
        pendingRefundsCount: 0,
        pendingPayoutsCount: 0,
      },
      operationalAlerts: alerts,
      recentActivity: recentAuditLogs,
      timestamp: new Date().toISOString(),
    };
  }

  public async getAppointmentDetails(appointmentIdOrPublicId: string) {
    const isPublicId = appointmentIdOrPublicId.startsWith('APT-');
    const appointment = await this.prisma.appointment.findFirst({
      where: isPublicId
        ? { publicAppointmentId: appointmentIdOrPublicId }
        : { id: appointmentIdOrPublicId },
      include: {
        patient: {
          select: {
            id: true,
            publicPatientId: true,
            displayName: true,
            user: {
              select: {
                id: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        doctor: {
          select: {
            id: true,
            publicDoctorId: true,
            displayName: true,
            medicalRegistrationNumber: true,
            licensingCouncil: true,
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
        consultationOffer: {
          select: {
            id: true,
            title: true,
            consultationType: true,
            durationMinutes: true,
            fee: true,
            currency: true,
          },
        },
        cancellation: {
          select: {
            id: true,
            cancelledBy: true,
            cancellationActorType: true,
            reason: true,
            reasonCode: true,
            cancelledAt: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundError(`Appointment '${appointmentIdOrPublicId}' not found`);
    }

    return {
      id: appointment.id,
      publicAppointmentId: appointment.publicAppointmentId,
      status: appointment.status,
      reservationState: appointment.reservationState,
      startAt: appointment.startAt.toISOString(),
      endAt: appointment.endAt.toISOString(),
      confirmedAt: appointment.confirmedAt ? appointment.confirmedAt.toISOString() : null,
      startedAt: appointment.startedAt ? appointment.startedAt.toISOString() : null,
      completedAt: appointment.completedAt ? appointment.completedAt.toISOString() : null,
      cancelledAt: appointment.cancelledAt ? appointment.cancelledAt.toISOString() : null,
      cancellationReason: appointment.cancellationReason,
      cancelledBy: appointment.cancelledBy,
      declineReason: appointment.declineReason,
      declinedAt: appointment.declinedAt ? appointment.declinedAt.toISOString() : null,
      createdAt: appointment.createdAt.toISOString(),
      patient: appointment.patient,
      doctor: appointment.doctor,
      consultationOffer: appointment.consultationOffer,
      cancellation: appointment.cancellation,
    };
  }
}

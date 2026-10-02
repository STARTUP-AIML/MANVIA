import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service.js';
import type { AdminAppointmentQueryDto } from '../dto/admin-appointment-query.dto.js';
import type { AdminCareRelationshipQueryDto } from '../dto/admin-care-relationship-query.dto.js';
import type { AdminPaymentQueryDto } from '../dto/admin-payment-query.dto.js';

@Injectable()
export class AdminOversightService {
  constructor(private readonly prisma: PrismaService) {}

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
}

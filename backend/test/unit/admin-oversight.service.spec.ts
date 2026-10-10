import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdminOversightService } from '../../src/modules/admin/services/admin-oversight.service.js';
import type { PrismaService } from '../../src/database/prisma.service.js';
import { AppointmentStatus, CareRelationshipStatus, PaymentStatus } from '@prisma/client';

describe('AdminOversightService (Unit)', () => {
  let service: AdminOversightService;
  let mockPrisma: {
    patientProfile: {
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    doctorProfile: {
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    appointment: {
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    careRelationship: {
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    payment: {
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      aggregate: ReturnType<typeof vi.fn>;
    };
    refund: {
      count: ReturnType<typeof vi.fn>;
    };
    doctorPayout: {
      count: ReturnType<typeof vi.fn>;
    };
    user: {
      count: ReturnType<typeof vi.fn>;
    };
    auditLog: {
      findMany: ReturnType<typeof vi.fn>;
    };
    notificationDelivery: {
      count: ReturnType<typeof vi.fn>;
    };
    notificationDevice: {
      count: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      user: {
        count: vi.fn(),
      },
      auditLog: {
        findMany: vi.fn(),
      },
      patientProfile: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      doctorProfile: {
        findMany: vi.fn(),
        count: vi.fn(),
        groupBy: vi.fn(),
      },
      appointment: {
        findMany: vi.fn(),
        count: vi.fn(),
        findFirst: vi.fn(),
        groupBy: vi.fn(),
      },
      careRelationship: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      payment: {
        findMany: vi.fn(),
        count: vi.fn(),
        aggregate: vi.fn(),
      },
      refund: {
        count: vi.fn(),
      },
      doctorPayout: {
        count: vi.fn(),
      },
      notificationDelivery: {
        count: vi.fn(),
      },
      notificationDevice: {
        count: vi.fn(),
      },
    };

    service = new AdminOversightService(mockPrisma as unknown as PrismaService);
  });

  it('should list patients with pagination', async () => {
    mockPrisma.patientProfile.findMany.mockResolvedValue([{ id: 'p-1', publicPatientId: 'PAT-1' }]);
    mockPrisma.patientProfile.count.mockResolvedValue(1);

    const result = await service.listPatients({ page: 1, limit: 10, search: 'PAT' });
    expect(result.total).toBe(1);
    expect(result.items.length).toBe(1);
  });

  it('should list doctors with specialty and verificationStatus filters', async () => {
    mockPrisma.doctorProfile.findMany.mockResolvedValue([{ id: 'd-1', publicDoctorId: 'DOC-1' }]);
    mockPrisma.doctorProfile.count.mockResolvedValue(1);

    const result = await service.listDoctors({
      page: 1,
      limit: 10,
      specialty: 'Cardiology',
      verificationStatus: 'VERIFIED',
    });
    expect(result.total).toBe(1);
    expect(result.items.length).toBe(1);
  });

  it('should list appointments with status filter and date range', async () => {
    mockPrisma.appointment.findMany.mockResolvedValue([{ id: 'apt-1' }]);
    mockPrisma.appointment.count.mockResolvedValue(1);

    const result = await service.listAppointments({
      page: 1,
      limit: 20,
      status: AppointmentStatus.CONFIRMED,
      startDate: '2026-09-01T00:00:00.000Z',
    });
    expect(result.total).toBe(1);
    expect(result.items.length).toBe(1);
  });

  it('should list care relationships with status filter', async () => {
    mockPrisma.careRelationship.findMany.mockResolvedValue([{ id: 'cr-1' }]);
    mockPrisma.careRelationship.count.mockResolvedValue(1);

    const result = await service.listCareRelationships({
      page: 1,
      limit: 20,
      status: CareRelationshipStatus.ACTIVE,
    });
    expect(result.total).toBe(1);
    expect(result.items.length).toBe(1);
  });

  it('should get financial overview with aggregated revenue, refunds, and payouts', async () => {
    mockPrisma.payment.findMany.mockResolvedValue([
      { id: 'pay-1', status: PaymentStatus.SUCCEEDED },
    ]);
    mockPrisma.payment.count.mockResolvedValue(1);
    mockPrisma.payment.aggregate.mockResolvedValue({
      _sum: { amount: 500 },
      _count: 5,
    });
    mockPrisma.refund.count.mockResolvedValue(2);
    mockPrisma.doctorPayout.count.mockResolvedValue(3);

    const result = await service.getPaymentsOverview({ page: 1, limit: 10 });
    expect(result.total).toBe(1);
    expect(result.metrics.totalSucceededRevenue).toBe(500);
    expect(result.metrics.totalSucceededTransactions).toBe(5);
    expect(result.metrics.pendingRefundsCount).toBe(2);
    expect(result.metrics.pendingPayoutsCount).toBe(3);
  });

  it('should get notification delivery metrics', async () => {
    mockPrisma.notificationDelivery.count
      .mockResolvedValueOnce(10) // pending
      .mockResolvedValueOnce(50) // sent
      .mockResolvedValueOnce(2) // failed
      .mockResolvedValueOnce(45); // delivered
    mockPrisma.notificationDevice.count.mockResolvedValue(120);

    const result = await service.getNotificationsOverview();
    expect(result.deliveries.pending).toBe(10);
    expect(result.deliveries.sent).toBe(50);
    expect(result.deliveries.failed).toBe(2);
    expect(result.deliveries.delivered).toBe(45);
    expect(result.deliveries.totalDeliveries).toBe(107);
    expect(result.activeDevices).toBe(120);
  });

  it('should aggregate real dashboard overview metrics for users, verifications, appointments, and alerts', async () => {
    mockPrisma.user.count
      .mockResolvedValueOnce(50) // total
      .mockResolvedValueOnce(40) // patient
      .mockResolvedValueOnce(8) // doctor
      .mockResolvedValueOnce(2) // admin
      .mockResolvedValueOnce(48) // active
      .mockResolvedValueOnce(2); // suspended

    mockPrisma.doctorProfile.groupBy.mockResolvedValue([
      { verificationStatus: 'PENDING_REVIEW', _count: { _all: 3 } },
      { verificationStatus: 'VERIFIED', _count: { _all: 5 } },
    ]);

    mockPrisma.appointment.groupBy.mockResolvedValue([
      { status: 'REQUESTED', _count: { _all: 4 } },
      { status: 'CONFIRMED', _count: { _all: 10 } },
      { status: 'COMPLETED', _count: { _all: 25 } },
    ]);

    mockPrisma.payment.findMany.mockResolvedValue([]);
    mockPrisma.payment.count.mockResolvedValue(20);
    mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 2000 }, _count: 20 });
    mockPrisma.refund.count.mockResolvedValue(1);
    mockPrisma.doctorPayout.count.mockResolvedValue(0);

    mockPrisma.auditLog.findMany.mockResolvedValue([
      {
        id: 'log-1',
        action: 'VERIFY_DOCTOR',
        resourceType: 'DOCTOR_VERIFICATION',
        resourceId: 'verif-1',
        actorUserId: 'admin-1',
        status: 'SUCCESS',
        createdAt: new Date(),
        ipAddress: '127.0.0.1',
      },
    ]);

    const overview = await service.getDashboardOverview();

    expect(overview.users.total).toBe(50);
    expect(overview.users.byRole.PATIENT).toBe(40);
    expect(overview.users.byRole.DOCTOR).toBe(8);
    expect(overview.users.byRole.ADMIN).toBe(2);
    expect(overview.doctorVerifications.total).toBe(8);
    expect(overview.doctorVerifications.pendingReviewCount).toBe(3);
    expect(overview.appointments.total).toBe(39);
    expect(overview.appointments.byStatus.CONFIRMED).toBe(10);
    expect(overview.operationalAlerts.length).toBeGreaterThan(0);
    expect(overview.operationalAlerts[0]?.id).toBe('pending-verifications');
    expect(overview.recentActivity).toHaveLength(1);
  });

  it('should retrieve detailed appointment record without clinical notes', async () => {
    mockPrisma.appointment.findFirst.mockResolvedValue({
      id: 'apt-uuid-1',
      publicAppointmentId: 'APT-12345678',
      status: AppointmentStatus.CONFIRMED,
      reservationState: 'BOOKED',
      startAt: new Date('2026-10-15T10:00:00.000Z'),
      endAt: new Date('2026-10-15T10:30:00.000Z'),
      confirmedAt: new Date('2026-10-14T09:00:00.000Z'),
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      cancellationReason: null,
      cancelledBy: null,
      declineReason: null,
      declinedAt: null,
      createdAt: new Date('2026-10-14T08:00:00.000Z'),
      patient: {
        id: 'p-1',
        publicPatientId: 'PAT-001',
        displayName: 'John Patient',
        user: { id: 'u-1', email: 'john@example.com', phone: null },
      },
      doctor: {
        id: 'd-1',
        publicDoctorId: 'DOC-001',
        displayName: 'Dr. Jane Doctor',
        medicalRegistrationNumber: 'REG-123',
        licensingCouncil: 'Medical Board',
        user: { id: 'u-2', email: 'jane@example.com' },
      },
      consultationOffer: {
        id: 'offer-1',
        title: 'Initial Consultation',
        consultationType: 'INITIAL',
        durationMinutes: 30,
        fee: 100,
        currency: 'USD',
      },
      cancellation: null,
    });

    const result = await service.getAppointmentDetails('APT-12345678');
    expect(result.id).toBe('apt-uuid-1');
    expect(result.publicAppointmentId).toBe('APT-12345678');
    expect(result.status).toBe(AppointmentStatus.CONFIRMED);
    expect(result.doctor.displayName).toBe('Dr. Jane Doctor');
    expect(result.patient.displayName).toBe('John Patient');
    expect((result as Record<string, unknown>).notes).toBeUndefined();
  });

  it('should throw NotFoundError if appointment record is not found', async () => {
    mockPrisma.appointment.findFirst.mockResolvedValue(null);

    await expect(service.getAppointmentDetails('non-existent')).rejects.toThrow();
  });
});

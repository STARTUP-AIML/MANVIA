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
    notificationDelivery: {
      count: ReturnType<typeof vi.fn>;
    };
    notificationDevice: {
      count: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      patientProfile: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      doctorProfile: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      appointment: {
        findMany: vi.fn(),
        count: vi.fn(),
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
});

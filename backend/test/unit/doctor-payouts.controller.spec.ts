import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DoctorPayoutsController } from '../../src/modules/payments/controllers/doctor-payouts.controller.js';
import type { DoctorPayoutService } from '../../src/modules/payments/services/doctor-payout.service.js';
import type { CurrentUserContext } from '../../src/modules/doctors/interfaces/auth-context.interface.js';
import { DoctorPayoutEntity } from '../../src/modules/payments/entities/doctor-payout.entity.js';
import { DoctorPayoutStatus } from '../../src/modules/payments/enums/doctor-payout-status.enum.js';

describe('DoctorPayoutsController (Unit Tests)', () => {
  let controller: DoctorPayoutsController;
  let service: Partial<DoctorPayoutService>;

  const mockDoctor: CurrentUserContext = {
    userId: 'doc-1',
    activeRole: 'DOCTOR',
  };

  const samplePayout = new DoctorPayoutEntity({
    id: 'po-1',
    publicPayoutId: 'PO-PUB-1',
    doctorId: 'doc-1',
    appointmentId: 'appt-1',
    paymentId: 'pay-1',
    grossAmount: '100.00',
    platformFee: '15.00',
    taxWithheld: '0.00',
    providerFee: '2.50',
    netAmount: '82.50',
    currency: 'USD',
    status: DoctorPayoutStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    service = {
      getPayouts: vi.fn().mockResolvedValue({
        items: [samplePayout],
        total: 1,
      }),
      getPayoutById: vi.fn().mockResolvedValue(samplePayout),
      processPayout: vi.fn().mockResolvedValue(samplePayout),
    };

    controller = new DoctorPayoutsController(service as DoctorPayoutService);
  });

  it('should list payouts for doctor', async () => {
    const result = await controller.getPayouts(mockDoctor, {});
    expect(service.getPayouts).toHaveBeenCalledWith({}, mockDoctor);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.netAmount).toBe('82.50');
  });

  it('should get payout by id', async () => {
    const result = await controller.getPayoutById(mockDoctor, 'po-1');
    expect(service.getPayoutById).toHaveBeenCalledWith('po-1', mockDoctor);
    expect(result.id).toBe('po-1');
  });

  it('should process payout when called', async () => {
    const adminActor: CurrentUserContext = { userId: 'adm-1', activeRole: 'ADMIN' };
    const result = await controller.processPayout(adminActor, 'po-1');
    expect(service.processPayout).toHaveBeenCalledWith('po-1', adminActor);
    expect(result.id).toBe('po-1');
  });
});

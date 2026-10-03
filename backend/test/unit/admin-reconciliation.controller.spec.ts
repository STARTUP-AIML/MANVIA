import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdminReconciliationController } from '../../src/modules/payments/controllers/admin-reconciliation.controller.js';
import type { ReconciliationService } from '../../src/modules/payments/services/reconciliation.service.js';
import type { CurrentUserContext } from '../../src/modules/doctors/interfaces/auth-context.interface.js';

describe('AdminReconciliationController (Unit Tests)', () => {
  let controller: AdminReconciliationController;
  let service: Partial<ReconciliationService>;

  const mockAdmin: CurrentUserContext = {
    userId: 'adm-1',
    activeRole: 'ADMIN',
  };

  const mockNonAdmin: CurrentUserContext = {
    userId: 'pat-1',
    activeRole: 'PATIENT',
  };

  beforeEach(() => {
    service = {
      reconcilePayments: vi.fn().mockResolvedValue({
        totalChecked: 10,
        matched: 10,
        discrepanciesCount: 0,
        discrepancies: [],
        checkedAt: new Date().toISOString(),
      }),
      reconcilePayouts: vi.fn().mockResolvedValue({
        totalChecked: 5,
        matched: 5,
        discrepanciesCount: 0,
        discrepancies: [],
        checkedAt: new Date().toISOString(),
      }),
    };

    controller = new AdminReconciliationController(service as ReconciliationService);
  });

  it('should run payments reconciliation for admin', async () => {
    const result = await controller.reconcilePayments(mockAdmin);
    expect(service.reconcilePayments).toHaveBeenCalled();
    expect(result.totalChecked).toBe(10);
  });

  it('should deny non-admin access to payments reconciliation', async () => {
    await expect(controller.reconcilePayments(mockNonAdmin)).rejects.toThrow(
      /Reconciliation operations are restricted to platform administrators/,
    );
  });

  it('should run payouts reconciliation for admin', async () => {
    const result = await controller.reconcilePayouts(mockAdmin);
    expect(service.reconcilePayouts).toHaveBeenCalled();
    expect(result.totalChecked).toBe(5);
  });

  it('should deny non-admin access to payouts reconciliation', async () => {
    await expect(controller.reconcilePayouts(mockNonAdmin)).rejects.toThrow(
      /Reconciliation operations are restricted to platform administrators/,
    );
  });
});

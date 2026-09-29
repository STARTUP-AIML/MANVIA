import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InvoicesController } from '../../src/modules/payments/controllers/invoices.controller.js';
import type { InvoiceService } from '../../src/modules/payments/services/invoice.service.js';
import type { CurrentUserContext } from '../../src/modules/doctors/interfaces/auth-context.interface.js';
import { InvoiceEntity } from '../../src/modules/payments/entities/invoice.entity.js';
import { InvoiceStatus } from '../../src/modules/payments/enums/invoice-status.enum.js';

describe('InvoicesController (Unit Tests)', () => {
  let controller: InvoicesController;
  let service: Partial<InvoiceService>;

  const mockActor: CurrentUserContext = {
    userId: 'pat-1',
    activeRole: 'PATIENT',
  };

  const sampleInvoice = new InvoiceEntity({
    id: 'inv-1',
    publicInvoiceId: 'INV-PUB-1',
    invoiceNumber: 'INV-202609-001',
    paymentId: 'pay-1',
    appointmentId: 'appt-1',
    patientId: 'pat-1',
    doctorId: 'doc-1',
    subtotal: '100.00',
    taxes: '0.00',
    discount: '0.00',
    platformFee: '15.00',
    total: '100.00',
    currency: 'USD',
    status: InvoiceStatus.PAID,
    issuedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    service = {
      getInvoices: vi.fn().mockResolvedValue({
        items: [sampleInvoice],
        total: 1,
      }),
      getInvoiceById: vi.fn().mockResolvedValue(sampleInvoice),
    };

    controller = new InvoicesController(service as InvoiceService);
  });

  it('should list invoices', async () => {
    const result = await controller.getInvoices(mockActor, {});
    expect(service.getInvoices).toHaveBeenCalledWith({}, mockActor);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.invoiceNumber).toBe('INV-202609-001');
  });

  it('should get invoice by id', async () => {
    const result = await controller.getInvoiceById(mockActor, 'inv-1');
    expect(service.getInvoiceById).toHaveBeenCalledWith('inv-1', mockActor);
    expect(result.id).toBe('inv-1');
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { InvoiceService } from '../../src/modules/payments/services/invoice.service.js';
import { InMemoryPaymentRepository } from '../../src/modules/payments/repositories/in-memory-payment.repository.js';
import { PaymentAuditService } from '../../src/modules/payments/services/payment-audit.service.js';
import { PaymentEntity } from '../../src/modules/payments/entities/payment.entity.js';
import { PaymentStatus } from '../../src/modules/payments/enums/payment-status.enum.js';
import type { IDoctorsRepository } from '../../src/modules/doctors/interfaces/doctor-repository.interface.js';
import type { ICareRelationshipRepository } from '../../src/modules/care-relationships/interfaces/care-relationship-repository.interface.js';

describe('Phase 19 — InvoiceService', () => {
  let invoiceService: InvoiceService;
  let paymentRepo: InMemoryPaymentRepository;
  let auditService: PaymentAuditService;

  beforeEach(() => {
    paymentRepo = new InMemoryPaymentRepository();
    auditService = new PaymentAuditService();
    invoiceService = new InvoiceService(paymentRepo, auditService);
  });

  it('should generate an immutable invoice with unique number and correct amounts', async () => {
    const payment = new PaymentEntity({
      id: 'pay-1',
      publicPaymentId: 'PAY-1',
      appointmentId: 'appt-1',
      patientId: 'pat-1',
      doctorId: 'doc-1',
      amount: '200.00',
      currency: 'USD',
      status: PaymentStatus.SUCCEEDED,
      provider: 'simulated',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const invoice = await invoiceService.generateInvoice({
      payment,
      appointmentId: 'appt-1',
      patientId: 'pat-1',
      doctorId: 'doc-1',
      breakdown: {
        baseAmount: '200.00',
        discount: '0.00',
        taxableAmount: '200.00',
        tax: '0.00',
        platformFee: '30.00',
        providerFee: '5.00',
        doctorShare: '165.00',
        total: '200.00',
        currency: 'USD',
      },
    });

    expect(invoice).toBeDefined();
    expect(invoice.invoiceNumber).toMatch(/^INV-\d{6}-[A-F0-9]{8}$/);
    expect(invoice.total).toBe('200.00');
    expect(invoice.status).toBe('PAID');
    expect(invoice.patientId).toBe('pat-1');
    expect(invoice.doctorId).toBe('doc-1');
  });

  it('should enforce role-based access control on invoice lookup', async () => {
    const payment = new PaymentEntity({
      id: 'pay-2',
      publicPaymentId: 'PAY-2',
      appointmentId: 'appt-2',
      patientId: 'pat-10',
      doctorId: 'doc-20',
      amount: '100.00',
      currency: 'USD',
      status: PaymentStatus.SUCCEEDED,
      provider: 'simulated',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const invoice = await invoiceService.generateInvoice({
      payment,
      appointmentId: 'appt-2',
      patientId: 'pat-10',
      doctorId: 'doc-20',
    });

    // Patient 10 can access
    const patientContext = { userId: 'pat-10', activeRole: 'PATIENT' as const };
    const fetched = await invoiceService.getInvoiceById(invoice.id, patientContext);
    expect(fetched.id).toBe(invoice.id);

    // Another patient (pat-99) must be denied
    const otherPatientContext = { userId: 'pat-99', activeRole: 'PATIENT' as const };
    await expect(invoiceService.getInvoiceById(invoice.id, otherPatientContext)).rejects.toThrow(
      /Patients are only authorized to access their own invoices/,
    );

    // Doctor 20 can access
    const doctorContext = { userId: 'doc-20', activeRole: 'DOCTOR' as const };
    const doctorFetched = await invoiceService.getInvoiceById(invoice.id, doctorContext);
    expect(doctorFetched.id).toBe(invoice.id);

    // Another doctor (doc-99) must be denied
    const otherDoctorContext = { userId: 'doc-99', activeRole: 'DOCTOR' as const };
    await expect(invoiceService.getInvoiceById(invoice.id, otherDoctorContext)).rejects.toThrow(
      /Doctors are only authorized to access invoices for their consultations/,
    );

    // Admin can access
    const adminContext = { userId: 'adm-1', activeRole: 'ADMIN' as const };
    const adminFetched = await invoiceService.getInvoiceById(invoice.id, adminContext);
    expect(adminFetched.id).toBe(invoice.id);
  });

  it('should return existing invoice on duplicate generation (idempotency)', async () => {
    const payment = new PaymentEntity({
      id: 'pay-idem',
      publicPaymentId: 'PAY-IDEM',
      appointmentId: 'appt-idem',
      patientId: 'pat-1',
      doctorId: 'doc-1',
      amount: '50.00',
      currency: 'USD',
      status: PaymentStatus.SUCCEEDED,
      provider: 'simulated',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const first = await invoiceService.generateInvoice({
      payment,
      appointmentId: 'appt-idem',
      patientId: 'pat-1',
      doctorId: 'doc-1',
    });

    const second = await invoiceService.generateInvoice({
      payment,
      appointmentId: 'appt-idem',
      patientId: 'pat-1',
      doctorId: 'doc-1',
    });

    expect(second.id).toBe(first.id);
    expect(second.invoiceNumber).toBe(first.invoiceNumber);
  });

  it('should query invoices with role scoping and profile resolution', async () => {
    const mockDoctorsRepo = {
      findByUserId: async (userId: string) => {
        if (userId === 'user-doc-profile') return { id: 'doc-p-1', publicDoctorId: 'DOC-P' };
        return null;
      },
    };

    const mockCareRelRepo = {
      findPatientByUserId: async (userId: string) => {
        if (userId === 'user-pat-profile') return { id: 'pat-p-1', publicPatientId: 'PAT-P' };
        return null;
      },
    };

    const service = new InvoiceService(
      paymentRepo,
      auditService,
      mockDoctorsRepo as unknown as IDoctorsRepository,
      mockCareRelRepo as unknown as ICareRelationshipRepository,
    );

    const payment = new PaymentEntity({
      id: 'pay-scoped',
      publicPaymentId: 'PAY-SCOPED',
      appointmentId: 'appt-scoped',
      patientId: 'pat-p-1',
      doctorId: 'doc-p-1',
      amount: '120.00',
      currency: 'USD',
      status: PaymentStatus.SUCCEEDED,
      provider: 'simulated',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const inv = await service.generateInvoice({
      payment,
      appointmentId: 'appt-scoped',
      patientId: 'pat-p-1',
      doctorId: 'doc-p-1',
    });

    // Patient with resolved profile
    const patInvoices = await service.getInvoices(
      {},
      { userId: 'user-pat-profile', activeRole: 'PATIENT' },
    );
    expect(patInvoices.total).toBe(1);

    // Doctor with resolved profile
    const docInvoices = await service.getInvoices(
      {},
      { userId: 'user-doc-profile', activeRole: 'DOCTOR' },
    );
    expect(docInvoices.total).toBe(1);

    // Admin
    const adminInvoices = await service.getInvoices({}, { userId: 'adm', activeRole: 'ADMIN' });
    expect(adminInvoices.total).toBe(1);

    // getInvoiceById with resolved profile
    const fetchedByPat = await service.getInvoiceById(inv.id, {
      userId: 'user-pat-profile',
      activeRole: 'PATIENT',
    });
    expect(fetchedByPat.id).toBe(inv.id);

    const fetchedByDoc = await service.getInvoiceById(inv.id, {
      userId: 'user-doc-profile',
      activeRole: 'DOCTOR',
    });
    expect(fetchedByDoc.id).toBe(inv.id);

    // Not found
    await expect(
      service.getInvoiceById('non-existent-inv', { userId: 'adm', activeRole: 'ADMIN' }),
    ).rejects.toThrow('Invoice non-existent-inv not found');
  });
});

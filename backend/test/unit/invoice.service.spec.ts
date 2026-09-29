import { describe, it, expect, beforeEach } from 'vitest';
import { InvoiceService } from '../../src/modules/payments/services/invoice.service.js';
import { InMemoryPaymentRepository } from '../../src/modules/payments/repositories/in-memory-payment.repository.js';
import { PaymentAuditService } from '../../src/modules/payments/services/payment-audit.service.js';
import { PaymentEntity } from '../../src/modules/payments/entities/payment.entity.js';
import { PaymentStatus } from '../../src/modules/payments/enums/payment-status.enum.js';

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
});

import { Module, forwardRef } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module.js';
import { DoctorsModule } from '../doctors/doctors.module.js';
import { DoctorAvailabilityModule } from '../doctor-availability/doctor-availability.module.js';
import { CareRelationshipsModule } from '../care-relationships/care-relationships.module.js';
import { PaymentsController } from './controllers/payments.controller.js';
import { PaymentWebhooksController } from './controllers/payment-webhooks.controller.js';
import { InvoicesController } from './controllers/invoices.controller.js';
import { DoctorPayoutsController } from './controllers/doctor-payouts.controller.js';
import { AdminReconciliationController } from './controllers/admin-reconciliation.controller.js';
import { PaymentsService } from './services/payments.service.js';
import { PaymentWebhookService } from './services/payment-webhook.service.js';
import { InvoiceService } from './services/invoice.service.js';
import { DoctorPayoutService } from './services/doctor-payout.service.js';
import { PayoutEligibilityService } from './services/payout-eligibility.service.js';
import { PricingService } from './services/pricing.service.js';
import { ReconciliationService } from './services/reconciliation.service.js';
import { PaymentAuditService } from './services/payment-audit.service.js';
import { SimulatedPaymentProvider } from './providers/simulated-payment.provider.js';
import { SimulatedPayoutProvider } from './providers/simulated-payout.provider.js';
import { InMemoryPaymentRepository } from './repositories/in-memory-payment.repository.js';
import { PrismaPaymentRepository } from './repositories/prisma-payment.repository.js';
import { PAYMENT_REPOSITORY } from './interfaces/payment-repository.interface.js';
import { PAYMENT_PROVIDER } from './interfaces/payment-provider.interface.js';
import { DatabaseModule } from '../../database/database.module.js';
import { PAYOUT_PROVIDER } from './interfaces/payout-provider.interface.js';
import { PRICING_STRATEGY } from './interfaces/pricing-strategy.interface.js';
import { PAYMENT_AUDIT_SERVICE } from './interfaces/payment-audit-service.interface.js';

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => AppointmentsModule),
    DoctorsModule,
    DoctorAvailabilityModule,
    CareRelationshipsModule,
  ],
  controllers: [
    PaymentsController,
    PaymentWebhooksController,
    InvoicesController,
    DoctorPayoutsController,
    AdminReconciliationController,
  ],
  providers: [
    PaymentsService,
    PaymentWebhookService,
    InvoiceService,
    DoctorPayoutService,
    PayoutEligibilityService,
    PricingService,
    ReconciliationService,
    PaymentAuditService,
    SimulatedPaymentProvider,
    SimulatedPayoutProvider,
    InMemoryPaymentRepository,
    PrismaPaymentRepository,
    {
      provide: PAYMENT_REPOSITORY,
      useClass: PrismaPaymentRepository,
    },
    {
      provide: PAYMENT_PROVIDER,
      useClass: SimulatedPaymentProvider,
    },
    {
      provide: PAYOUT_PROVIDER,
      useClass: SimulatedPayoutProvider,
    },
    {
      provide: PRICING_STRATEGY,
      useClass: PricingService,
    },
    {
      provide: PAYMENT_AUDIT_SERVICE,
      useClass: PaymentAuditService,
    },
  ],
  exports: [
    PaymentsService,
    PaymentWebhookService,
    InvoiceService,
    DoctorPayoutService,
    PayoutEligibilityService,
    PricingService,
    ReconciliationService,
    PAYMENT_REPOSITORY,
    PAYMENT_PROVIDER,
    PAYOUT_PROVIDER,
    PAYMENT_AUDIT_SERVICE,
  ],
})
export class PaymentsModule {}

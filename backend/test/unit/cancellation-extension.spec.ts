import { describe, it, expect, beforeEach } from 'vitest';
import { AppointmentsService } from '../../src/modules/appointments/services/appointments.service.js';
import { AppointmentStateMachineService } from '../../src/modules/appointments/services/appointment-state-machine.service.js';
import { PreConsultationService } from '../../src/modules/appointments/services/pre-consultation.service.js';
import { AppointmentAuditService } from '../../src/modules/appointments/services/appointment-audit.service.js';
import { CancellationPolicyService } from '../../src/modules/appointments/services/cancellation-policy.service.js';
import { InMemoryAppointmentRepository } from '../../src/modules/appointments/repositories/in-memory-appointment.repository.js';
import { CareRelationshipsService } from '../../src/modules/care-relationships/services/care-relationships.service.js';
import { InMemoryCareRelationshipRepository } from '../../src/modules/care-relationships/repositories/in-memory-care-relationship.repository.js';
import { InMemoryDoctorsRepository } from '../../src/modules/doctors/repositories/in-memory-doctors.repository.js';
import { InMemoryDoctorAvailabilityRepository } from '../../src/modules/doctor-availability/repositories/in-memory-doctor-availability.repository.js';
import { ConsentAuditService } from '../../src/modules/care-relationships/services/consent-audit.service.js';
import { RefundsService } from '../../src/modules/refunds/services/refunds.service.js';
import { InMemoryRefundRepository } from '../../src/modules/refunds/repositories/in-memory-refund.repository.js';
import { SimulatedRefundProvider } from '../../src/modules/refunds/providers/simulated-refund.provider.js';
import { RefundAuditService } from '../../src/modules/refunds/services/refund-audit.service.js';
import { WaitlistService } from '../../src/modules/waitlist/services/waitlist.service.js';
import { InMemoryWaitlistRepository } from '../../src/modules/waitlist/repositories/in-memory-waitlist.repository.js';
import { WaitlistAuditService } from '../../src/modules/waitlist/services/waitlist-audit.service.js';
import { NotificationService } from '../../src/common/notifications/notification.service.js';
import { VerificationStatus } from '../../src/modules/doctors/enums/verification-status.enum.js';
import { ConsultationType } from '../../src/modules/doctor-availability/enums/consultation-type.enum.js';
import { OfferStatus } from '../../src/modules/doctor-availability/enums/offer-status.enum.js';
import { DayOfWeek } from '../../src/modules/doctor-availability/enums/day-of-week.enum.js';
import { AppointmentStatus } from '../../src/modules/appointments/enums/appointment-status.enum.js';
import { RefundStatus } from '../../src/modules/refunds/enums/refund-status.enum.js';
import { WaitlistStatus } from '../../src/modules/waitlist/enums/waitlist-status.enum.js';

describe('Appointments Cancellation Extension (Unit Tests)', () => {
  let appointmentsService: AppointmentsService;
  let appointmentRepo: InMemoryAppointmentRepository;
  let refundsService: RefundsService;
  let refundRepo: InMemoryRefundRepository;
  let waitlistService: WaitlistService;
  let waitlistRepo: InMemoryWaitlistRepository;
  let doctorsRepo: InMemoryDoctorsRepository;
  let availabilityRepo: InMemoryDoctorAvailabilityRepository;
  let careRelRepo: InMemoryCareRelationshipRepository;

  const PATIENT_USER = 'patient-alice';
  const WAITLIST_PATIENT_USER = 'patient-bob';
  const DOCTOR_USER = 'doctor-house';
  const ADMIN_USER = 'admin-carol';

  let doctorId: string;
  let offerId: string;

  beforeEach(async () => {
    appointmentRepo = new InMemoryAppointmentRepository();
    doctorsRepo = new InMemoryDoctorsRepository();
    availabilityRepo = new InMemoryDoctorAvailabilityRepository();
    careRelRepo = new InMemoryCareRelationshipRepository();
    refundRepo = new InMemoryRefundRepository();
    waitlistRepo = new InMemoryWaitlistRepository();

    const apptAudit = new AppointmentAuditService();
    const consentAudit = new ConsentAuditService();
    const refundAudit = new RefundAuditService();
    const waitlistAudit = new WaitlistAuditService();
    const notificationService = new NotificationService();
    const stateMachine = new AppointmentStateMachineService();
    const cancellationPolicy = new CancellationPolicyService();

    const careRelService = new CareRelationshipsService(careRelRepo, doctorsRepo, consentAudit);
    const preConsultationService = new PreConsultationService(
      appointmentRepo,
      apptAudit,
      careRelService,
      doctorsRepo,
    );

    refundsService = new RefundsService(
      refundRepo,
      new SimulatedRefundProvider(),
      refundAudit,
      appointmentRepo,
      careRelRepo,
      doctorsRepo,
      notificationService,
    );

    waitlistService = new WaitlistService(
      waitlistRepo,
      waitlistAudit,
      careRelService,
      careRelRepo,
      doctorsRepo,
      availabilityRepo,
      appointmentRepo,
      notificationService,
    );

    appointmentsService = new AppointmentsService(
      appointmentRepo,
      apptAudit,
      stateMachine,
      preConsultationService,
      careRelService,
      careRelRepo,
      doctorsRepo,
      availabilityRepo,
      cancellationPolicy,
      refundsService,
      waitlistService,
      notificationService,
    );

    // Doctor profile & verification
    const doctor = await doctorsRepo.createProfile({
      userId: DOCTOR_USER,
      publicDoctorId: 'DOC-10101010',
      displayName: 'Dr. Gregory House',
      medicalRegistrationNumber: 'MED-1010',
      licensingCouncil: 'Council',
      yearsOfExperience: 20,
      defaultConsultationFee: 150,
      currency: 'USD',
    });
    await doctorsRepo.updateVerificationStatus(doctor.id, VerificationStatus.VERIFIED);
    doctorId = doctor.id;

    // Consultation offer
    const offer = await availabilityRepo.createOffer(doctorId, {
      title: 'Diagnostics Consult',
      durationMinutes: 30,
      fee: 150,
      currency: 'USD',
      consultationType: ConsultationType.INITIAL,
      status: OfferStatus.ACTIVE,
    });
    offerId = offer.id;

    // Availability window on Mondays
    await availabilityRepo.createAvailability(doctorId, {
      timezone: 'UTC',
      dayOfWeek: DayOfWeek.MONDAY,
      startTime: '09:00',
      endTime: '17:00',
    });
  });

  it('patient cancellation >24h should create cancellation record, trigger 100% refund, and offer slot to waitlist', async () => {
    // 1. Waitlist patient joins waitlist
    const waitlistEntry = await waitlistService.joinWaitlist(WAITLIST_PATIENT_USER, {
      doctorId,
      consultationOfferId: offerId,
    });

    // 2. Alice books appointment >24h in advance (e.g. next Monday)
    const slotStart = new Date('2026-10-12T10:00:00.000Z');
    const appt = await appointmentsService.createAppointment(PATIENT_USER, {
      doctorId,
      consultationOfferId: offerId,
      startAt: slotStart.toISOString(),
      notes: 'Initial consultation',
    });

    // Doctor accepts appointment
    await appointmentsService.acceptDoctorAppointment(DOCTOR_USER, appt.id);

    // 3. Alice cancels appointment
    const cancelled = await appointmentsService.cancelPatientAppointment(PATIENT_USER, appt.id, {
      reason: 'Schedule conflict',
      requestRefund: true,
    });

    expect(cancelled.status).toBe(AppointmentStatus.CANCELLED);

    // 4. Verify cancellation record exists
    const record = await appointmentsService.getAppointmentCancellation(
      { userId: PATIENT_USER, activeRole: 'PATIENT' },
      appt.id,
    );
    expect(record.reason).toBe('Schedule conflict');
    expect(record.cancellationActorType).toBe('PATIENT');
    expect(record.policyResult?.refundEligibility).toBe('FULL');
    expect(record.refunds?.length).toBe(1);
    expect(record.refunds![0]!.status).toBe(RefundStatus.SUCCEEDED);
    expect(record.refunds![0]!.amount).toBe(150);

    // 5. Verify waitlist entry was offered the freed slot
    const updatedWaitlist = await waitlistService.getPatientWaitlistEntryById(
      WAITLIST_PATIENT_USER,
      waitlistEntry.id,
    );
    expect(updatedWaitlist.status).toBe(WaitlistStatus.OFFERED);
    expect(updatedWaitlist.offeredAppointmentPublicId).toBeDefined();
  });

  it('doctor cancellation should initiate 100% refund to patient regardless of time', async () => {
    const slotStart = new Date('2026-10-12T14:00:00.000Z');
    const appt = await appointmentsService.createAppointment(PATIENT_USER, {
      doctorId,
      consultationOfferId: offerId,
      startAt: slotStart.toISOString(),
    });
    await appointmentsService.acceptDoctorAppointment(DOCTOR_USER, appt.id);

    // Doctor cancels
    const cancelled = await appointmentsService.cancelDoctorAppointment(DOCTOR_USER, appt.id, {
      reason: 'Emergency surgery scheduled',
    });
    expect(cancelled.status).toBe(AppointmentStatus.CANCELLED);

    const record = await appointmentsService.getAppointmentCancellation(
      { userId: DOCTOR_USER, activeRole: 'DOCTOR' },
      appt.id,
    );
    expect(record.cancellationActorType).toBe('DOCTOR');
    expect(record.policyResult?.refundEligibility).toBe('FULL');
    expect(record.refunds![0]!.status).toBe(RefundStatus.SUCCEEDED);
    expect(record.refunds![0]!.amount).toBe(150);
  });

  it('admin override cancellation should initiate 100% refund', async () => {
    const slotStart = new Date('2026-10-12T15:00:00.000Z');
    const appt = await appointmentsService.createAppointment(PATIENT_USER, {
      doctorId,
      consultationOfferId: offerId,
      startAt: slotStart.toISOString(),
    });
    await appointmentsService.acceptDoctorAppointment(DOCTOR_USER, appt.id);

    // Admin cancels
    const cancelled = await appointmentsService.cancelAdminAppointment(ADMIN_USER, appt.id, {
      reason: 'Administrative dispute resolution',
      requestRefund: true,
    });
    expect(cancelled.status).toBe(AppointmentStatus.CANCELLED);

    const record = await appointmentsService.getAppointmentCancellation(
      { userId: ADMIN_USER, activeRole: 'ADMIN' },
      appt.id,
    );
    expect(record.cancellationActorType).toBe('ADMIN');
    expect(record.refunds![0]!.status).toBe(RefundStatus.SUCCEEDED);
  });
});

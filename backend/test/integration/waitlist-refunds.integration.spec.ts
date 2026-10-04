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

describe('Phase 14 End-to-End Integration Flow: Booking -> Cancellation -> Refund -> Waitlist Cascade -> Acceptance', () => {
  let appointmentsService: AppointmentsService;
  let refundsService: RefundsService;
  let waitlistService: WaitlistService;

  const PATIENT_ALICE = 'patient-alice-flow';
  const PATIENT_BOB = 'patient-bob-waitlist';
  const PATIENT_CHARLIE = 'patient-charlie-waitlist';
  const DOCTOR_HOUSE = 'doctor-house-flow';

  let doctorId: string;
  let offerId: string;

  beforeEach(async () => {
    const appointmentRepo = new InMemoryAppointmentRepository();
    const doctorsRepo = new InMemoryDoctorsRepository();
    const availabilityRepo = new InMemoryDoctorAvailabilityRepository();
    const careRelRepo = new InMemoryCareRelationshipRepository();
    const refundRepo = new InMemoryRefundRepository();
    const waitlistRepo = new InMemoryWaitlistRepository();

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

    // Setup doctor
    const doc = await doctorsRepo.createProfile({
      userId: DOCTOR_HOUSE,
      publicDoctorId: 'DOC-FLOW-01',
      displayName: 'Dr. Gregory House',
      medicalRegistrationNumber: 'MED-FLOW',
      licensingCouncil: 'Board',
      yearsOfExperience: 15,
      defaultConsultationFee: 200,
      currency: 'USD',
    });
    await doctorsRepo.updateVerificationStatus(doc.id, VerificationStatus.VERIFIED);
    doctorId = doc.id;

    // Doctor availability window (Full Mondays 08:00 - 18:00)
    await availabilityRepo.createAvailability(doctorId, {
      timezone: 'UTC',
      dayOfWeek: DayOfWeek.MONDAY,
      startTime: '08:00',
      endTime: '18:00',
    });

    // Consultation offer
    const offer = await availabilityRepo.createOffer(doctorId, {
      title: 'Full Diagnostics Consult',
      consultationType: ConsultationType.INITIAL,
      durationMinutes: 60,
      fee: 200,
      currency: 'USD',
      status: OfferStatus.ACTIVE,
    });
    offerId = offer.id;
  });

  it('completes the full lifecycle: booking -> cancellation with policy -> refund issuance -> automatic waitlist offer -> candidate acceptance', async () => {
    // 1. Bob and Charlie join waitlist for Dr. House
    const bobWaitlist = await waitlistService.joinWaitlist(PATIENT_BOB, {
      doctorId,
      consultationOfferId: offerId,
      priority: 10, // Higher priority
    });
    const charlieWaitlist = await waitlistService.joinWaitlist(PATIENT_CHARLIE, {
      doctorId,
      consultationOfferId: offerId,
      priority: 5,
    });

    expect(bobWaitlist.status).toBe(WaitlistStatus.ACTIVE);
    expect(charlieWaitlist.status).toBe(WaitlistStatus.ACTIVE);

    // 2. Alice books an appointment on Monday at 10:00 AM (e.g., 2026-10-12)
    const slotStart = new Date('2026-10-12T10:00:00.000Z');
    const aliceAppointment = await appointmentsService.createAppointment(PATIENT_ALICE, {
      doctorId,
      consultationOfferId: offerId,
      startAt: slotStart.toISOString(),
      notes: 'Initial clinical intake',
    });

    // Doctor confirms appointment
    await appointmentsService.acceptDoctorAppointment(DOCTOR_HOUSE, aliceAppointment.id);

    // 3. Alice cancels her appointment > 24 hours prior
    const cancelledAppt = await appointmentsService.cancelPatientAppointment(
      PATIENT_ALICE,
      aliceAppointment.id,
      {
        reason: 'Work travel emergency',
        requestRefund: true,
      },
    );
    expect(cancelledAppt.status).toBe(AppointmentStatus.CANCELLED);

    // 4. Verify 100% refund record was automatically processed
    const aliceRefunds = await refundsService.getPatientRefunds(PATIENT_ALICE, {
      page: 1,
      limit: 10,
    });
    expect(aliceRefunds.data.length).toBe(1);
    expect(aliceRefunds.data[0]!.amount).toBe(200);
    expect(aliceRefunds.data[0]!.status).toBe(RefundStatus.SUCCEEDED);

    // 5. Verify the freed slot was immediately cascaded and offered to top waitlist candidate (Bob)
    const updatedBob = await waitlistService.getPatientWaitlistEntryById(
      PATIENT_BOB,
      bobWaitlist.id,
    );
    expect(updatedBob.status).toBe(WaitlistStatus.OFFERED);
    expect(updatedBob.offeredAppointmentPublicId).toBeDefined();

    // Charlie has not yet received an offer
    const updatedCharlie = await waitlistService.getPatientWaitlistEntryById(
      PATIENT_CHARLIE,
      charlieWaitlist.id,
    );
    expect(updatedCharlie.status).toBe(WaitlistStatus.ACTIVE);

    // 6. Bob accepts the waitlist offer
    const acceptedBob = await waitlistService.acceptOffer(PATIENT_BOB, bobWaitlist.id);
    expect(acceptedBob.status).toBe(WaitlistStatus.FULFILLED);

    // 7. Verify Bob now has a confirmed appointment in that slot
    const bobAppointments = await appointmentsService.getPatientAppointments(PATIENT_BOB, {
      limit: 10,
    });
    expect(bobAppointments.data.length).toBe(1);
    expect(bobAppointments.data[0]!.status).toBe(AppointmentStatus.CONFIRMED);
    expect(bobAppointments.data[0]!.startAt).toBe(slotStart.toISOString());
  });

  it('handles offer decline and cascades offer to next eligible waitlist candidate', async () => {
    // Bob (priority 10) and Charlie (priority 5) join
    const bob = await waitlistService.joinWaitlist(PATIENT_BOB, {
      doctorId,
      consultationOfferId: offerId,
      priority: 10,
    });
    const charlie = await waitlistService.joinWaitlist(PATIENT_CHARLIE, {
      doctorId,
      consultationOfferId: offerId,
      priority: 5,
    });

    const slotStart = new Date('2026-10-05T14:00:00.000Z');
    const slotEnd = new Date('2026-10-05T15:00:00.000Z');

    // Slot becomes available and is offered to Bob
    await waitlistService.matchAndOfferSlot(doctorId, slotStart, slotEnd, offerId);

    // Bob declines the offer
    const declinedBob = await waitlistService.declineOffer(PATIENT_BOB, bob.id, {
      reason: 'No longer needed',
    });
    expect(declinedBob.status).toBe(WaitlistStatus.DECLINED);

    // Charlie should now immediately receive the slot offer
    const updatedCharlie = await waitlistService.getPatientWaitlistEntryById(
      PATIENT_CHARLIE,
      charlie.id,
    );
    expect(updatedCharlie.status).toBe(WaitlistStatus.OFFERED);
  });
});

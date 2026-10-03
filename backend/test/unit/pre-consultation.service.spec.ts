import { describe, it, expect, beforeEach } from 'vitest';
import { PreConsultationService } from '../../src/modules/appointments/services/pre-consultation.service.js';
import { InMemoryAppointmentRepository } from '../../src/modules/appointments/repositories/in-memory-appointment.repository.js';
import { AppointmentAuditService } from '../../src/modules/appointments/services/appointment-audit.service.js';
import { CareRelationshipsService } from '../../src/modules/care-relationships/services/care-relationships.service.js';
import { InMemoryCareRelationshipRepository } from '../../src/modules/care-relationships/repositories/in-memory-care-relationship.repository.js';
import { InMemoryDoctorsRepository } from '../../src/modules/doctors/repositories/in-memory-doctors.repository.js';
import { ConsentAuditService } from '../../src/modules/care-relationships/services/consent-audit.service.js';
import { VerificationStatus } from '../../src/modules/doctors/enums/verification-status.enum.js';
import { AppointmentStatus } from '../../src/modules/appointments/enums/appointment-status.enum.js';
import { PreConsultationStatus } from '../../src/modules/appointments/enums/pre-consultation-status.enum.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../src/common/errors/app-error.js';
import type { AppointmentEntity } from '../../src/modules/appointments/entities/appointment.entity.js';

describe('PreConsultationService (Unit Tests)', () => {
  let service: PreConsultationService;
  let appointmentRepo: InMemoryAppointmentRepository;
  let doctorsRepo: InMemoryDoctorsRepository;
  let careRelRepo: InMemoryCareRelationshipRepository;
  let careRelService: CareRelationshipsService;

  const PATIENT_USER = 'patient-user-1';
  const OTHER_PATIENT_USER = 'patient-user-2';
  const DOCTOR_USER = 'doctor-user-1';
  const OTHER_DOCTOR_USER = 'doctor-user-2';

  let doctorId: string;
  let patientId: string;
  let activeAppointment: AppointmentEntity;

  beforeEach(async () => {
    appointmentRepo = new InMemoryAppointmentRepository();
    doctorsRepo = new InMemoryDoctorsRepository();
    careRelRepo = new InMemoryCareRelationshipRepository();
    const auditService = new AppointmentAuditService();
    const consentAuditService = new ConsentAuditService();
    careRelService = new CareRelationshipsService(careRelRepo, doctorsRepo, consentAuditService);

    service = new PreConsultationService(
      appointmentRepo,
      auditService,
      careRelService,
      doctorsRepo,
    );

    // Setup doctor 1
    const doc1 = await doctorsRepo.createProfile({
      userId: DOCTOR_USER,
      publicDoctorId: 'DOC-11111111',
      displayName: 'Dr. Gregory House',
      medicalRegistrationNumber: 'MED-12345',
      licensingCouncil: 'Medical Board',
      yearsOfExperience: 15,
      defaultConsultationFee: 100,
      currency: 'USD',
    });
    await doctorsRepo.updateVerificationStatus(doc1.id, VerificationStatus.VERIFIED);
    doctorId = doc1.id;

    // Setup doctor 2
    const doc2 = await doctorsRepo.createProfile({
      userId: OTHER_DOCTOR_USER,
      publicDoctorId: 'DOC-22222222',
      displayName: 'Dr. Allison Cameron',
      medicalRegistrationNumber: 'MED-67890',
      licensingCouncil: 'Medical Board',
      yearsOfExperience: 8,
      defaultConsultationFee: 80,
      currency: 'USD',
    });
    await doctorsRepo.updateVerificationStatus(doc2.id, VerificationStatus.VERIFIED);

    // Setup patient
    const patientProfile = await careRelService.getOrCreatePatientProfile(PATIENT_USER);
    patientId = patientProfile.id;

    // Create an active appointment
    const now = new Date(Date.now() + 86400000);
    const end = new Date(now.getTime() + 30 * 60000);
    activeAppointment = await appointmentRepo.createAppointment({
      patientId,
      doctorId,
      consultationOfferId: 'offer-1',
      startAt: now,
      endAt: end,
      status: AppointmentStatus.REQUESTED,
    });
  });

  describe('Draft Management', () => {
    it('returns NOT_STARTED when viewing pre-consultation before drafting', async () => {
      const res = await service.getPreConsultationForPatient(PATIENT_USER, activeAppointment.id);
      expect(res.status).toBe(PreConsultationStatus.NOT_STARTED);
      expect(res.appointmentId).toBe(activeAppointment.id);
      expect(res.reasonForVisit).toBe('');
    });

    it('creates an intake draft in IN_PROGRESS status', async () => {
      const draft = await service.saveDraft(PATIENT_USER, activeAppointment.id, {
        reasonForVisit: 'Persistent headache for 4 days',
        symptoms: 'Throbbing left temple, nausea',
        allergies: 'Penicillin',
      });

      expect(draft.status).toBe(PreConsultationStatus.IN_PROGRESS);
      expect(draft.reasonForVisit).toBe('Persistent headache for 4 days');
      expect(draft.symptoms).toBe('Throbbing left temple, nausea');
      expect(draft.allergies).toBe('Penicillin');
      expect(draft.submittedAt).toBeNull();
    });

    it('updates an existing draft successfully', async () => {
      await service.saveDraft(PATIENT_USER, activeAppointment.id, {
        reasonForVisit: 'Initial draft',
      });

      const updated = await service.saveDraft(PATIENT_USER, activeAppointment.id, {
        reasonForVisit: 'Updated detailed reason for visit',
        currentMedications: 'Paracetamol 500mg',
      });

      expect(updated.reasonForVisit).toBe('Updated detailed reason for visit');
      expect(updated.currentMedications).toBe('Paracetamol 500mg');
      expect(updated.status).toBe(PreConsultationStatus.IN_PROGRESS);
    });

    it('rejects drafting for an appointment belonging to another patient', async () => {
      await expect(
        service.saveDraft(OTHER_PATIENT_USER, activeAppointment.id, {
          reasonForVisit: 'Hacking attempt',
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('Intake Submission & Immutability', () => {
    it('submits and locks pre-consultation intake', async () => {
      await service.saveDraft(PATIENT_USER, activeAppointment.id, {
        reasonForVisit: 'Seasonal allergy flare-up',
        symptoms: 'Sneezing, itchy eyes',
      });

      const submitted = await service.submitPreConsultation(PATIENT_USER, activeAppointment.id);
      expect(submitted.status).toBe(PreConsultationStatus.SUBMITTED);
      expect(submitted.submittedAt).not.toBeNull();
    });

    it('rejects submitting without a draft', async () => {
      await expect(
        service.submitPreConsultation(PATIENT_USER, activeAppointment.id),
      ).rejects.toThrow(ValidationError);
    });

    it('rejects modifying intake once submitted (immutability rule)', async () => {
      await service.saveDraft(PATIENT_USER, activeAppointment.id, {
        reasonForVisit: 'Skin rash',
      });
      await service.submitPreConsultation(PATIENT_USER, activeAppointment.id);

      await expect(
        service.saveDraft(PATIENT_USER, activeAppointment.id, {
          reasonForVisit: 'Trying to alter after submission',
        }),
      ).rejects.toThrow(ConflictError);
    });

    it('rejects submitting an already submitted intake', async () => {
      await service.saveDraft(PATIENT_USER, activeAppointment.id, {
        reasonForVisit: 'Back pain',
      });
      await service.submitPreConsultation(PATIENT_USER, activeAppointment.id);

      await expect(
        service.submitPreConsultation(PATIENT_USER, activeAppointment.id),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('Doctor Access Boundaries', () => {
    it('allows assigned physician to view submitted intake', async () => {
      await service.saveDraft(PATIENT_USER, activeAppointment.id, {
        reasonForVisit: 'Knee pain after running',
        symptoms: 'Swelling on right patella',
      });
      await service.submitPreConsultation(PATIENT_USER, activeAppointment.id);

      const doctorView = await service.getPreConsultationForDoctor(
        DOCTOR_USER,
        activeAppointment.id,
      );
      expect(doctorView.reasonForVisit).toBe('Knee pain after running');
      expect(doctorView.status).toBe(PreConsultationStatus.SUBMITTED);
    });

    it('forbids physician from accessing draft before patient submits it', async () => {
      await service.saveDraft(PATIENT_USER, activeAppointment.id, {
        reasonForVisit: 'Sensitive draft not yet submitted',
      });

      await expect(
        service.getPreConsultationForDoctor(DOCTOR_USER, activeAppointment.id),
      ).rejects.toThrow(ForbiddenError);
    });

    it('rejects an unrelated physician from viewing the intake', async () => {
      await service.saveDraft(PATIENT_USER, activeAppointment.id, {
        reasonForVisit: 'Confidential clinical condition',
      });
      await service.submitPreConsultation(PATIENT_USER, activeAppointment.id);

      await expect(
        service.getPreConsultationForDoctor(OTHER_DOCTOR_USER, activeAppointment.id),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('Inactive Appointment Guard', () => {
    it('rejects draft modifications if appointment was cancelled', async () => {
      await appointmentRepo.updateAppointment(activeAppointment.id, {
        status: AppointmentStatus.CANCELLED,
      });

      await expect(
        service.saveDraft(PATIENT_USER, activeAppointment.id, {
          reasonForVisit: 'Attempt on cancelled appointment',
        }),
      ).rejects.toThrow(ValidationError);
    });
  });
});

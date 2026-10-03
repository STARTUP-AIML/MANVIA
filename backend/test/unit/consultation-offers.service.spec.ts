import { describe, it, expect, beforeEach } from 'vitest';
import { ConsultationOffersService } from '../../src/modules/doctor-availability/services/consultation-offers.service.js';
import { InMemoryDoctorAvailabilityRepository } from '../../src/modules/doctor-availability/repositories/in-memory-doctor-availability.repository.js';
import { InMemoryDoctorsRepository } from '../../src/modules/doctors/repositories/in-memory-doctors.repository.js';
import { ConsultationType } from '../../src/modules/doctor-availability/enums/consultation-type.enum.js';
import { OfferStatus } from '../../src/modules/doctor-availability/enums/offer-status.enum.js';
import { VerificationStatus } from '../../src/modules/doctors/enums/verification-status.enum.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../src/common/errors/app-error.js';

describe('ConsultationOffersService (Unit Tests)', () => {
  let service: ConsultationOffersService;
  let availabilityRepo: InMemoryDoctorAvailabilityRepository;
  let doctorsRepo: InMemoryDoctorsRepository;

  const DOCTOR_A_USER = 'usr-doc-a';
  const DOCTOR_B_USER = 'usr-doc-b';

  beforeEach(async () => {
    doctorsRepo = new InMemoryDoctorsRepository();
    availabilityRepo = new InMemoryDoctorAvailabilityRepository();

    service = new ConsultationOffersService(availabilityRepo, doctorsRepo);

    // Create Verified Doctor A
    await doctorsRepo.createProfile({
      userId: DOCTOR_A_USER,
      publicDoctorId: 'DOC-OFFER-A',
      displayName: 'Dr. Gregory House',
      medicalRegistrationNumber: 'MED-OFFER-1',
      licensingCouncil: 'NJ Board',
      yearsOfExperience: 20,
    });
    const docA = await doctorsRepo.findByUserId(DOCTOR_A_USER);
    await doctorsRepo.updateVerificationStatus(docA!.id, VerificationStatus.VERIFIED, new Date());

    // Create Unverified Doctor B
    await doctorsRepo.createProfile({
      userId: DOCTOR_B_USER,
      publicDoctorId: 'DOC-OFFER-B',
      displayName: 'Dr. John Watson',
      medicalRegistrationNumber: 'MED-OFFER-2',
      licensingCouncil: 'UK GMC',
      yearsOfExperience: 10,
    });
  });

  describe('Create Consultation Offer', () => {
    it('should create an active consultation offer with structured metadata', async () => {
      const offer = await service.createOffer(DOCTOR_A_USER, {
        title: 'Initial Diagnostic Evaluation',
        description: 'Comprehensive 45-minute medical intake and symptom review',
        consultationType: ConsultationType.INITIAL,
        durationMinutes: 45,
        fee: 150.0,
        currency: 'USD',
      });

      expect(offer.id).toBeDefined();
      expect(offer.title).toBe('Initial Diagnostic Evaluation');
      expect(offer.consultationType).toBe(ConsultationType.INITIAL);
      expect(offer.durationMinutes).toBe(45);
      expect(offer.fee).toBe(150.0);
      expect(offer.currency).toBe('USD');
      expect(offer.status).toBe(OfferStatus.ACTIVE);
    });

    it('should reject consultation offer with non-positive duration', async () => {
      await expect(
        service.createOffer(DOCTOR_A_USER, {
          title: 'Zero minute consultation',
          consultationType: ConsultationType.GENERAL,
          durationMinutes: 0,
          fee: 50.0,
          currency: 'USD',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should reject consultation offer with negative fee', async () => {
      await expect(
        service.createOffer(DOCTOR_A_USER, {
          title: 'Negative fee consultation',
          consultationType: ConsultationType.GENERAL,
          durationMinutes: 30,
          fee: -10.0,
          currency: 'USD',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should reject invalid currency codes', async () => {
      await expect(
        service.createOffer(DOCTOR_A_USER, {
          title: 'Invalid currency consultation',
          consultationType: ConsultationType.GENERAL,
          durationMinutes: 30,
          fee: 50.0,
          currency: 'US', // not 3 letters
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should reject duplicate active offer with same title, type, and duration', async () => {
      await service.createOffer(DOCTOR_A_USER, {
        title: 'General Follow-up',
        consultationType: ConsultationType.FOLLOW_UP,
        durationMinutes: 30,
        fee: 75.0,
        currency: 'USD',
      });

      await expect(
        service.createOffer(DOCTOR_A_USER, {
          title: 'General Follow-up',
          consultationType: ConsultationType.FOLLOW_UP,
          durationMinutes: 30,
          fee: 80.0,
          currency: 'USD',
        }),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('Manage Consultation Offers', () => {
    it('should list all offers for authenticated doctor', async () => {
      await service.createOffer(DOCTOR_A_USER, {
        title: 'Offer 1',
        consultationType: ConsultationType.INITIAL,
        durationMinutes: 30,
        fee: 100,
      });
      await service.createOffer(DOCTOR_A_USER, {
        title: 'Offer 2',
        consultationType: ConsultationType.FOLLOW_UP,
        durationMinutes: 15,
        fee: 50,
      });

      const list = await service.getSelfOffers(DOCTOR_A_USER);
      expect(list).toHaveLength(2);
    });

    it('should update consultation offer fields', async () => {
      const offer = await service.createOffer(DOCTOR_A_USER, {
        title: 'Draft Specialist Consult',
        consultationType: ConsultationType.SPECIALIST,
        durationMinutes: 60,
        fee: 250,
        status: OfferStatus.DRAFT,
      });

      const updated = await service.updateOffer(DOCTOR_A_USER, offer.id, {
        fee: 280,
        status: OfferStatus.ACTIVE,
      });

      expect(updated.fee).toBe(280);
      expect(updated.status).toBe(OfferStatus.ACTIVE);
    });

    it('SECURITY: should prevent Doctor B from modifying Doctor A offer', async () => {
      const offerA = await service.createOffer(DOCTOR_A_USER, {
        title: 'Doctor A Consult',
        consultationType: ConsultationType.INITIAL,
        durationMinutes: 30,
        fee: 100,
      });

      await expect(service.updateOffer(DOCTOR_B_USER, offerA.id, { fee: 10 })).rejects.toThrow(
        ForbiddenError,
      );
    });

    it('SECURITY: should prevent Doctor B from deleting Doctor A offer', async () => {
      const offerA = await service.createOffer(DOCTOR_A_USER, {
        title: 'Doctor A Consult',
        consultationType: ConsultationType.INITIAL,
        durationMinutes: 30,
        fee: 100,
      });

      await expect(service.deleteOffer(DOCTOR_B_USER, offerA.id)).rejects.toThrow(ForbiddenError);
    });
  });

  describe('Patient Discovery — Verified Doctor Rule', () => {
    it('should return active consultation offers for a verified doctor', async () => {
      await service.createOffer(DOCTOR_A_USER, {
        title: 'Active Consult',
        consultationType: ConsultationType.GENERAL,
        durationMinutes: 30,
        fee: 90,
        status: OfferStatus.ACTIVE,
      });
      await service.createOffer(DOCTOR_A_USER, {
        title: 'Inactive Consult',
        consultationType: ConsultationType.SPECIALIST,
        durationMinutes: 60,
        fee: 200,
        status: OfferStatus.INACTIVE,
      });

      const publicOffers = await service.getDoctorPublicOffers('DOC-OFFER-A');
      expect(publicOffers).toHaveLength(1);
      expect(publicOffers[0]?.title).toBe('Active Consult');
    });

    it('VERIFIED DOCTOR RULE: should reject patient discovery for unverified doctor with 404', async () => {
      await service.createOffer(DOCTOR_B_USER, {
        title: 'Unverified Doctor Consult',
        consultationType: ConsultationType.GENERAL,
        durationMinutes: 30,
        fee: 90,
        status: OfferStatus.ACTIVE,
      });

      await expect(service.getDoctorPublicOffers('DOC-OFFER-B')).rejects.toThrow(NotFoundError);
    });
  });
});

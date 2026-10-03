import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryDoctorsRepository } from '../../src/modules/doctors/repositories/in-memory-doctors.repository.js';
import { DoctorsService } from '../../src/modules/doctors/services/doctors.service.js';
import { VerificationStatus } from '../../src/modules/doctors/enums/verification-status.enum.js';
import { ConflictError, NotFoundError } from '../../src/common/errors/app-error.js';

describe('DoctorsService', () => {
  let repository: InMemoryDoctorsRepository;
  let service: DoctorsService;

  beforeEach(() => {
    repository = new InMemoryDoctorsRepository();
    service = new DoctorsService(repository);
  });

  it('should initialize a doctor profile with valid inputs, auto-generate DOC- public ID, and set status to DRAFT', async () => {
    const userId = '11111111-1111-1111-1111-111111111111';
    const specialties = await repository.findActiveSpecialties();
    const languages = await repository.findAllLanguages();

    const cardio = specialties.find((s) => s.code === 'CARDIO')!;
    const english = languages.find((l) => l.code === 'en')!;

    const profile = await service.initializeProfile(userId, {
      displayName: 'Dr. Rajesh Nair, MD',
      medicalRegistrationNumber: 'MCI-2008-84729',
      licensingCouncil: 'Medical Council of India',
      yearsOfExperience: 14,
      defaultConsultationFee: 45.0,
      currency: 'USD',
      bio: 'Consultant cardiologist specializing in preventive cardiovascular wellness.',
      specialties: [{ specialtyId: cardio.id, isPrimary: true }],
      languages: [{ languageId: english.id }],
      qualifications: [
        {
          qualification: 'MBBS',
          institution: 'All India Institute of Medical Sciences',
          graduationYear: 2008,
        },
        {
          qualification: 'MD (Cardiology)',
          institution: 'Johns Hopkins University',
          fieldOfStudy: 'Cardiology',
          graduationYear: 2012,
        },
      ],
    });

    expect(profile).toBeDefined();
    expect(profile.id).toBeDefined();
    expect(profile.userId).toBe(userId);
    expect(profile.publicDoctorId).toMatch(/^DOC-[A-Z0-9]{8}$/);
    expect(profile.displayName).toBe('Dr. Rajesh Nair, MD');
    expect(profile.medicalRegistrationNumber).toBe('MCI-2008-84729');
    expect(profile.licensingCouncil).toBe('Medical Council of India');
    expect(profile.yearsOfExperience).toBe(14);
    expect(profile.verificationStatus).toBe(VerificationStatus.DRAFT);
    expect(profile.verifiedAt).toBeNull();
    expect(profile.defaultConsultationFee).toBe(45.0);
    expect(profile.currency).toBe('USD');

    // Specialties check
    expect(profile.specialties.length).toBe(1);
    expect(profile.specialties[0]!.code).toBe('CARDIO');
    expect(profile.specialties[0]!.isPrimary).toBe(true);

    // Languages check
    expect(profile.languages.length).toBe(1);
    expect(profile.languages[0]!.code).toBe('en');

    // Qualifications check
    expect(profile.qualifications.length).toBe(2);
    expect(profile.qualifications[0]!.qualification).toBe('MBBS');
    expect(profile.qualifications[1]!.qualification).toBe('MD (Cardiology)');
  });

  it('should prevent creating duplicate doctor profile for the same user account', async () => {
    const userId = '22222222-2222-2222-2222-222222222222';

    await service.initializeProfile(userId, {
      displayName: 'Dr. Sarah Connor',
      medicalRegistrationNumber: 'REG-1001',
      licensingCouncil: 'State Medical Board',
    });

    await expect(
      service.initializeProfile(userId, {
        displayName: 'Dr. Sarah Connor (Duplicate)',
        medicalRegistrationNumber: 'REG-1002',
        licensingCouncil: 'State Medical Board',
      }),
    ).rejects.toThrow(ConflictError);
  });

  it('should prevent duplicate medical registration numbers across different doctors', async () => {
    const doctor1UserId = '33333333-3333-3333-3333-333333333333';
    const doctor2UserId = '44444444-4444-4444-4444-444444444444';

    await service.initializeProfile(doctor1UserId, {
      displayName: 'Dr. Doctor One',
      medicalRegistrationNumber: 'REG-SHARED-UNIQUE',
      licensingCouncil: 'State Medical Board',
    });

    await expect(
      service.initializeProfile(doctor2UserId, {
        displayName: 'Dr. Doctor Two',
        medicalRegistrationNumber: 'REG-SHARED-UNIQUE',
        licensingCouncil: 'State Medical Board',
      }),
    ).rejects.toThrow(ConflictError);
  });

  it('should prevent duplicate specialty assignments on the same doctor profile', async () => {
    const userId = '55555555-5555-5555-5555-555555555555';
    const specialties = await repository.findActiveSpecialties();
    const cardio = specialties.find((s) => s.code === 'CARDIO')!;

    await expect(
      service.initializeProfile(userId, {
        displayName: 'Dr. Cardio Duplicate',
        medicalRegistrationNumber: 'REG-5555',
        licensingCouncil: 'Board',
        specialties: [
          { specialtyId: cardio.id, isPrimary: true },
          { specialtyId: cardio.id, isPrimary: false },
        ],
      }),
    ).rejects.toThrow(ConflictError);
  });

  it('should retrieve self profile for an authenticated doctor', async () => {
    const userId = '66666666-6666-6666-6666-666666666666';

    await service.initializeProfile(userId, {
      displayName: 'Dr. Profile Self',
      medicalRegistrationNumber: 'REG-6666',
      licensingCouncil: 'Board',
      yearsOfExperience: 8,
    });

    const selfProfile = await service.getSelfProfile(userId);
    expect(selfProfile).toBeDefined();
    expect(selfProfile.userId).toBe(userId);
    expect(selfProfile.medicalRegistrationNumber).toBe('REG-6666');
    expect(selfProfile.yearsOfExperience).toBe(8);
  });

  it('should throw NotFoundError if doctor profile does not exist when fetching self', async () => {
    const uninitializedUserId = '99999999-9999-9999-9999-999999999999';
    await expect(service.getSelfProfile(uninitializedUserId)).rejects.toThrow(NotFoundError);
  });

  it('should update allowed profile fields and preserve immutability of system fields', async () => {
    const userId = '77777777-7777-7777-7777-777777777777';

    const created = await service.initializeProfile(userId, {
      displayName: 'Dr. Original Name',
      medicalRegistrationNumber: 'REG-7777',
      licensingCouncil: 'Original Board',
      yearsOfExperience: 5,
      defaultConsultationFee: 30.0,
      bio: 'Original bio',
    });

    const updated = await service.updateSelfProfile(userId, {
      displayName: 'Dr. Updated Name, MD',
      bio: 'Updated clinical bio statement',
      yearsOfExperience: 6,
      defaultConsultationFee: 40.0,
      currency: 'EUR',
    });

    expect(updated.displayName).toBe('Dr. Updated Name, MD');
    expect(updated.bio).toBe('Updated clinical bio statement');
    expect(updated.yearsOfExperience).toBe(6);
    expect(updated.defaultConsultationFee).toBe(40.0);
    expect(updated.currency).toBe('EUR');

    // Immutability checks: ID, UserID, Public ID, Registration Number, Verification Status remain unchanged
    expect(updated.id).toBe(created.id);
    expect(updated.userId).toBe(created.userId);
    expect(updated.publicDoctorId).toBe(created.publicDoctorId);
    expect(updated.medicalRegistrationNumber).toBe('REG-7777');
    expect(updated.verificationStatus).toBe(VerificationStatus.DRAFT);
  });

  it('should retrieve public doctor profile stripping sensitive registration numbers and internal IDs', async () => {
    const userId = '88888888-8888-8888-8888-888888888888';
    const specialties = await repository.findActiveSpecialties();
    const cardio = specialties.find((s) => s.code === 'CARDIO')!;
    const neuro = specialties.find((s) => s.code === 'NEURO')!;

    const created = await service.initializeProfile(userId, {
      displayName: 'Dr. Public Doctor',
      medicalRegistrationNumber: 'SECRET-REG-NUM-8888',
      licensingCouncil: 'Secret Council',
      yearsOfExperience: 20,
      defaultConsultationFee: 50.0,
      currency: 'USD',
      specialties: [
        { specialtyId: cardio.id, isPrimary: true },
        { specialtyId: neuro.id, isPrimary: false },
      ],
    });

    const publicProfile = await service.getPublicDoctorById(created.publicDoctorId);

    expect(publicProfile.publicDoctorId).toBe(created.publicDoctorId);
    expect(publicProfile.displayName).toBe('Dr. Public Doctor');
    expect(publicProfile.primarySpecialty).toBe('Cardiology');
    expect(publicProfile.subSpecialties).toContain('Neurology');
    expect(publicProfile.yearsOfExperience).toBe(20);
    expect(publicProfile.defaultConsultationFee).toBe(50.0);
    expect(publicProfile.currency).toBe('USD');

    // Verify sensitive and internal fields are completely stripped from public response
    expect('id' in (publicProfile as object)).toBe(false);
    expect('userId' in (publicProfile as object)).toBe(false);
    expect('medicalRegistrationNumber' in (publicProfile as object)).toBe(false);
    expect('licensingCouncil' in (publicProfile as object)).toBe(false);
  });

  it('should search public doctor directory by specialty and language with pagination', async () => {
    const specialties = await repository.findActiveSpecialties();
    const languages = await repository.findAllLanguages();

    const cardio = specialties.find((s) => s.code === 'CARDIO')!;
    const dermatology = specialties.find((s) => s.code === 'DERMATOLOGY')!;
    const hindi = languages.find((l) => l.code === 'hi')!;
    const spanish = languages.find((l) => l.code === 'es')!;

    await service.initializeProfile('user-doc-1', {
      displayName: 'Dr. Cardio Specialist',
      medicalRegistrationNumber: 'REG-DOC-1',
      licensingCouncil: 'Board',
      specialties: [{ specialtyId: cardio.id, isPrimary: true }],
      languages: [{ languageId: hindi.id }],
    });

    await service.initializeProfile('user-doc-2', {
      displayName: 'Dr. Dermatology Specialist',
      medicalRegistrationNumber: 'REG-DOC-2',
      licensingCouncil: 'Board',
      specialties: [{ specialtyId: dermatology.id, isPrimary: true }],
      languages: [{ languageId: spanish.id }],
    });

    // Search by specialty
    const cardioResults = await service.searchPublicDoctors({ specialty: 'CARDIO' });
    expect(cardioResults.total).toBe(1);
    expect(cardioResults.data[0]!.displayName).toBe('Dr. Cardio Specialist');

    // Search by language
    const spanishResults = await service.searchPublicDoctors({ language: 'es' });
    expect(spanishResults.total).toBe(1);
    expect(spanishResults.data[0]!.displayName).toBe('Dr. Dermatology Specialist');

    // Search all with pagination
    const allResults = await service.searchPublicDoctors({ limit: 1, offset: 0 });
    expect(allResults.total).toBe(2);
    expect(allResults.data.length).toBe(1);
  });
});

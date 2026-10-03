import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryDoctorsRepository } from '../../src/modules/doctors/repositories/in-memory-doctors.repository.js';
import { ConflictError, NotFoundError } from '../../src/common/errors/app-error.js';

describe('Doctors Repository Integration & Integrity', () => {
  let repository: InMemoryDoctorsRepository;

  beforeEach(() => {
    repository = new InMemoryDoctorsRepository();
  });

  it('should persist a doctor profile with normalized relational specialties, languages, and qualifications', async () => {
    const specialties = await repository.findActiveSpecialties();
    const languages = await repository.findAllLanguages();

    const spec1 = specialties[0]!;
    const spec2 = specialties[1]!;
    const lang1 = languages[0]!;
    const lang2 = languages[1]!;

    const created = await repository.createProfile({
      userId: 'user-int-1',
      publicDoctorId: 'DOC-INT00001',
      displayName: 'Dr. Integration Specialist',
      medicalRegistrationNumber: 'REG-INT-1',
      licensingCouncil: 'Council',
      specialties: [
        { specialtyId: spec1.id, isPrimary: true },
        { specialtyId: spec2.id, isPrimary: false },
      ],
      languages: [{ languageId: lang1.id }, { languageId: lang2.id }],
      qualifications: [
        {
          qualification: 'MBBS',
          institution: 'Medical University',
          graduationYear: 2010,
        },
      ],
    });

    expect(created.id).toBeDefined();
    expect(created.specialties.length).toBe(2);
    expect(created.languages.length).toBe(2);
    expect(created.qualifications.length).toBe(1);

    // Verify lookup by ID retains normalized joined references
    const fetched = await repository.findById(created.id);
    expect(fetched).toBeDefined();
    expect(fetched?.specialties[0]?.specialty?.name).toBe(spec1.name);
    expect(fetched?.languages[0]?.language?.name).toBe(lang1.name);
  });

  it('should enforce unique user_id constraint (1:1 relationship with User identity)', async () => {
    await repository.createProfile({
      userId: 'user-unique-test',
      publicDoctorId: 'DOC-INT00002',
      displayName: 'Dr. First Instance',
      medicalRegistrationNumber: 'REG-INT-2',
      licensingCouncil: 'Council',
    });

    await expect(
      repository.createProfile({
        userId: 'user-unique-test',
        publicDoctorId: 'DOC-INT00003',
        displayName: 'Dr. Second Instance',
        medicalRegistrationNumber: 'REG-INT-3',
        licensingCouncil: 'Council',
      }),
    ).rejects.toThrow(ConflictError);
  });

  it('should enforce unique medical_registration_number constraint', async () => {
    await repository.createProfile({
      userId: 'user-doc-alpha',
      publicDoctorId: 'DOC-INT00004',
      displayName: 'Dr. Alpha',
      medicalRegistrationNumber: 'REG-IDENTICAL',
      licensingCouncil: 'Council',
    });

    await expect(
      repository.createProfile({
        userId: 'user-doc-beta',
        publicDoctorId: 'DOC-INT00005',
        displayName: 'Dr. Beta',
        medicalRegistrationNumber: 'REG-IDENTICAL',
        licensingCouncil: 'Council',
      }),
    ).rejects.toThrow(ConflictError);
  });

  it('should enforce foreign key validation when referencing non-existent specialty', async () => {
    await expect(
      repository.createProfile({
        userId: 'user-doc-fk-test',
        publicDoctorId: 'DOC-INT00006',
        displayName: 'Dr. FK Test',
        medicalRegistrationNumber: 'REG-INT-6',
        licensingCouncil: 'Council',
        specialties: [{ specialtyId: '99999999-9999-9999-9999-999999999999' }],
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it('should enforce foreign key validation when referencing non-existent language', async () => {
    await expect(
      repository.createProfile({
        userId: 'user-doc-fk-test2',
        publicDoctorId: 'DOC-INT00007',
        displayName: 'Dr. FK Test 2',
        medicalRegistrationNumber: 'REG-INT-7',
        licensingCouncil: 'Council',
        languages: [{ languageId: '99999999-9999-9999-9999-999999999999' }],
      }),
    ).rejects.toThrow(NotFoundError);
  });
});

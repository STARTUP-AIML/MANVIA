import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'node:crypto';
import { PrismaDoctorsRepository } from '../../src/modules/doctors/repositories/prisma-doctors.repository.js';
import { PrismaService } from '../../src/database/prisma.service.js';
import { ConfigService } from '../../src/config/config.service.js';
import { seedTaxonomies } from '../../src/database/seeds/taxonomy.seed.js';
import { VerificationStatus } from '../../src/modules/doctors/enums/verification-status.enum.js';
import { ConflictError, NotFoundError } from '../../src/common/errors/app-error.js';

describe('Doctors Repository Integration & PostgreSQL Persistence', () => {
  let prismaService: PrismaService;
  let repository: PrismaDoctorsRepository;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const configService = new ConfigService();
    prismaService = new PrismaService(configService);
    await prismaService.onModuleInit();

    // Ensure taxonomy baseline is seeded in PostgreSQL
    await seedTaxonomies(prismaService);

    repository = new PrismaDoctorsRepository(prismaService);
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await prismaService.doctorSpecialty.deleteMany({});
      await prismaService.doctorLanguage.deleteMany({});
      await prismaService.doctorQualification.deleteMany({});
      await prismaService.doctorProfile.deleteMany({
        where: { userId: { in: createdUserIds } },
      });
      await prismaService.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
    }
    await prismaService.onApplicationShutdown();
  });

  async function createTestUser(): Promise<string> {
    const user = await prismaService.user.create({
      data: {
        email: `doc-int-${crypto.randomUUID()}@example.com`,
        roles: ['DOCTOR'],
        status: 'ACTIVE',
      },
    });
    createdUserIds.push(user.id);
    return user.id;
  }

  it('should persist a doctor profile with normalized relational specialties, languages, and qualifications in PostgreSQL', async () => {
    const userId = await createTestUser();
    const specialties = await repository.findActiveSpecialties();
    const languages = await repository.findAllLanguages();

    expect(specialties.length).toBeGreaterThanOrEqual(2);
    expect(languages.length).toBeGreaterThanOrEqual(2);

    const spec1 = specialties[0]!;
    const spec2 = specialties[1]!;
    const lang1 = languages[0]!;
    const lang2 = languages[1]!;

    const publicDoctorId = `DOC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const regNumber = `REG-${crypto.randomUUID().substring(0, 8)}`;

    const created = await repository.createProfile({
      userId,
      publicDoctorId,
      displayName: 'Dr. Integration Specialist',
      bio: 'Board-certified clinical practitioner',
      medicalRegistrationNumber: regNumber,
      licensingCouncil: 'General Medical Council',
      yearsOfExperience: 12,
      defaultConsultationFee: 150.0,
      currency: 'USD',
      specialties: [
        { specialtyId: spec1.id, isPrimary: true },
        { specialtyId: spec2.id, isPrimary: false },
      ],
      languages: [{ languageId: lang1.id }, { languageId: lang2.id }],
      qualifications: [
        {
          qualification: 'MBBS',
          institution: 'Johns Hopkins University',
          graduationYear: 2012,
        },
      ],
    });

    expect(created.id).toBeDefined();
    expect(created.userId).toBe(userId);
    expect(created.publicDoctorId).toBe(publicDoctorId);
    expect(created.specialties).toHaveLength(2);
    expect(created.languages).toHaveLength(2);
    expect(created.qualifications).toHaveLength(1);
    expect(created.verificationStatus).toBe(VerificationStatus.DRAFT);

    // Verify lookup by ID from PostgreSQL retains normalized joined references
    const fetched = await repository.findById(created.id);
    expect(fetched).toBeDefined();
    expect(fetched?.displayName).toBe('Dr. Integration Specialist');
    expect(fetched?.specialties[0]?.specialty?.name).toBe(spec1.name);
    expect(fetched?.languages[0]?.language?.name).toBe(lang1.name);
    expect(fetched?.qualifications[0]?.qualification).toBe('MBBS');

    // Verify lookup by user ID
    const byUser = await repository.findByUserId(userId);
    expect(byUser?.id).toBe(created.id);
  });

  it('should update doctor profile and modify qualifications and specialties in PostgreSQL', async () => {
    const userId = await createTestUser();
    const specialties = await repository.findActiveSpecialties();
    const languages = await repository.findAllLanguages();

    const created = await repository.createProfile({
      userId,
      publicDoctorId: `DOC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      displayName: 'Dr. Initial Name',
      medicalRegistrationNumber: `REG-${crypto.randomUUID().substring(0, 8)}`,
      licensingCouncil: 'Council',
      specialties: [{ specialtyId: specialties[0]!.id, isPrimary: true }],
      languages: [{ languageId: languages[0]!.id }],
    });

    const updated = await repository.updateProfile(created.id, {
      displayName: 'Dr. Updated Name',
      bio: 'Updated bio information',
      yearsOfExperience: 15,
      defaultConsultationFee: 200,
      specialties: [{ specialtyId: specialties[1]!.id, isPrimary: true }],
      languages: [{ languageId: languages[0]!.id }, { languageId: languages[1]!.id }],
      qualifications: [
        {
          qualification: 'MD',
          institution: 'Harvard Medical School',
          graduationYear: 2015,
        },
      ],
    });

    expect(updated.displayName).toBe('Dr. Updated Name');
    expect(updated.bio).toBe('Updated bio information');
    expect(updated.yearsOfExperience).toBe(15);
    expect(updated.specialties).toHaveLength(1);
    expect(updated.specialties[0]?.specialtyId).toBe(specialties[1]!.id);
    expect(updated.languages).toHaveLength(2);
    expect(updated.qualifications).toHaveLength(1);
    expect(updated.qualifications[0]?.qualification).toBe('MD');
  });

  it('should update verification status and persist verifiedAt in PostgreSQL', async () => {
    const userId = await createTestUser();
    const created = await repository.createProfile({
      userId,
      publicDoctorId: `DOC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      displayName: 'Dr. Status Test',
      medicalRegistrationNumber: `REG-${crypto.randomUUID().substring(0, 8)}`,
      licensingCouncil: 'Council',
    });

    const now = new Date();
    const verified = await repository.updateVerificationStatus(
      created.id,
      VerificationStatus.VERIFIED,
      now,
    );

    expect(verified.verificationStatus).toBe(VerificationStatus.VERIFIED);
    expect(verified.verifiedAt).toBeDefined();

    // Verify in database
    const fetched = await repository.findById(created.id);
    expect(fetched?.verificationStatus).toBe(VerificationStatus.VERIFIED);
  });

  it('should filter public doctors to ONLY expose VERIFIED physicians', async () => {
    const userDraft = await createTestUser();
    const userVerified = await createTestUser();

    const draftDoctor = await repository.createProfile({
      userId: userDraft,
      publicDoctorId: `DOC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      displayName: 'Dr. Draft Doctor',
      medicalRegistrationNumber: `REG-${crypto.randomUUID().substring(0, 8)}`,
      licensingCouncil: 'Council',
    });

    const verifiedDoctor = await repository.createProfile({
      userId: userVerified,
      publicDoctorId: `DOC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      displayName: 'Dr. Truly Verified',
      medicalRegistrationNumber: `REG-${crypto.randomUUID().substring(0, 8)}`,
      licensingCouncil: 'Council',
    });

    await repository.updateVerificationStatus(
      verifiedDoctor.id,
      VerificationStatus.VERIFIED,
      new Date(),
    );

    const publicDocs = await repository.findPublicDoctors({});
    const foundDraft = publicDocs.doctors.some((d) => d.id === draftDoctor.id);
    const foundVerified = publicDocs.doctors.some((d) => d.id === verifiedDoctor.id);

    expect(foundDraft).toBe(false);
    expect(foundVerified).toBe(true);
  });

  it('should enforce unique user_id constraint in PostgreSQL', async () => {
    const userId = await createTestUser();
    await repository.createProfile({
      userId,
      publicDoctorId: `DOC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      displayName: 'Dr. First Instance',
      medicalRegistrationNumber: `REG-${crypto.randomUUID().substring(0, 8)}`,
      licensingCouncil: 'Council',
    });

    await expect(
      repository.createProfile({
        userId,
        publicDoctorId: `DOC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        displayName: 'Dr. Second Instance',
        medicalRegistrationNumber: `REG-${crypto.randomUUID().substring(0, 8)}`,
        licensingCouncil: 'Council',
      }),
    ).rejects.toThrow(ConflictError);
  });

  it('should enforce unique medical_registration_number constraint in PostgreSQL', async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser();
    const sharedRegNum = `SHARED-REG-${crypto.randomUUID().substring(0, 8)}`;

    await repository.createProfile({
      userId: user1,
      publicDoctorId: `DOC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      displayName: 'Dr. Alpha',
      medicalRegistrationNumber: sharedRegNum,
      licensingCouncil: 'Council',
    });

    await expect(
      repository.createProfile({
        userId: user2,
        publicDoctorId: `DOC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        displayName: 'Dr. Beta',
        medicalRegistrationNumber: sharedRegNum,
        licensingCouncil: 'Council',
      }),
    ).rejects.toThrow(ConflictError);
  });

  it('should enforce foreign key validation when referencing non-existent specialty', async () => {
    const userId = await createTestUser();
    await expect(
      repository.createProfile({
        userId,
        publicDoctorId: `DOC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        displayName: 'Dr. FK Test',
        medicalRegistrationNumber: `REG-${crypto.randomUUID().substring(0, 8)}`,
        licensingCouncil: 'Council',
        specialties: [{ specialtyId: '00000000-0000-0000-0000-000000000000' }],
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it('should enforce foreign key validation when referencing non-existent language', async () => {
    const userId = await createTestUser();
    await expect(
      repository.createProfile({
        userId,
        publicDoctorId: `DOC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        displayName: 'Dr. FK Test 2',
        medicalRegistrationNumber: `REG-${crypto.randomUUID().substring(0, 8)}`,
        licensingCouncil: 'Council',
        languages: [{ languageId: '00000000-0000-0000-0000-000000000000' }],
      }),
    ).rejects.toThrow(NotFoundError);
  });
});

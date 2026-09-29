import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PrismaDoctorsRepository,
  type PrismaClientLike,
} from '../../src/modules/doctors/repositories/prisma-doctors.repository.js';
import { VerificationStatus } from '../../src/modules/doctors/enums/verification-status.enum.js';
import { ConflictError, NotFoundError } from '../../src/common/errors/app-error.js';

describe('PrismaDoctorsRepository', () => {
  let repository: PrismaDoctorsRepository;
  let mockPrisma: PrismaClientLike;

  const mockRawProfile = {
    id: 'doc-uuid-1',
    userId: 'user-uuid-1',
    publicDoctorId: 'DOC-123456',
    displayName: 'Dr. Jane Smith',
    bio: 'Cardiologist with 10 years experience',
    medicalRegistrationNumber: 'MED-REG-101',
    licensingCouncil: 'Medical Council of India',
    yearsOfExperience: 10,
    verificationStatus: 'DRAFT',
    defaultConsultationFee: '150.00',
    currency: 'USD',
    verifiedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    specialties: [
      {
        id: 'ds-1',
        doctorId: 'doc-uuid-1',
        specialtyId: 'spec-1',
        isPrimary: true,
        specialty: {
          id: 'spec-1',
          code: 'CARDIO',
          name: 'Cardiology',
          description: 'Heart care',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        createdAt: new Date(),
      },
    ],
    languages: [
      {
        id: 'dl-1',
        doctorId: 'doc-uuid-1',
        languageId: 'lang-1',
        language: {
          id: 'lang-1',
          code: 'en',
          name: 'English',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        createdAt: new Date(),
      },
    ],
    qualifications: [
      {
        id: 'dq-1',
        doctorId: 'doc-uuid-1',
        qualification: 'MD Cardiology',
        institution: 'Harvard Medical School',
        fieldOfStudy: 'Cardiology',
        graduationYear: 2016,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  beforeEach(() => {
    mockPrisma = {
      doctorProfile: {
        create: vi.fn().mockResolvedValue(mockRawProfile),
        findUnique: vi.fn().mockResolvedValue(mockRawProfile),
        findMany: vi.fn().mockResolvedValue([mockRawProfile]),
        count: vi.fn().mockResolvedValue(1),
        update: vi.fn().mockResolvedValue(mockRawProfile),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      specialty: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'spec-1',
            code: 'CARDIO',
            name: 'Cardiology',
            description: 'Heart care',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
        findUnique: vi.fn().mockResolvedValue({
          id: 'spec-1',
          code: 'CARDIO',
          name: 'Cardiology',
          description: 'Heart care',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        create: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
      language: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'lang-1',
            code: 'en',
            name: 'English',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
        findUnique: vi.fn().mockResolvedValue({
          id: 'lang-1',
          code: 'en',
          name: 'English',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        create: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
      doctorSpecialty: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      },
      doctorLanguage: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      },
      doctorQualification: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn().mockImplementation(async (cb) => cb(mockPrisma)),
    };

    repository = new PrismaDoctorsRepository(mockPrisma);
  });

  describe('ensurePrismaClient', () => {
    it('should throw if no client was passed', async () => {
      const emptyRepo = new PrismaDoctorsRepository();
      await expect(emptyRepo.findById('123')).rejects.toThrow(
        'PrismaClient instance not available',
      );
    });
  });

  describe('createProfile', () => {
    it('should create doctor profile with relations and map to entity', async () => {
      const res = await repository.createProfile({
        userId: 'user-uuid-1',
        publicDoctorId: 'DOC-123456',
        displayName: 'Dr. Jane Smith',
        medicalRegistrationNumber: 'MED-REG-101',
        licensingCouncil: 'Medical Council of India',
        specialties: [{ specialtyId: 'spec-1', isPrimary: true }],
        languages: [{ languageId: 'lang-1' }],
        qualifications: [{ qualification: 'MD Cardiology', institution: 'Harvard' }],
      });

      expect(res.id).toBe('doc-uuid-1');
      expect(res.defaultConsultationFee).toBe(150);
      expect(res.specialties).toHaveLength(1);
      expect(res.languages).toHaveLength(1);
      expect(res.qualifications).toHaveLength(1);
    });

    it('should throw ConflictError on duplicate user_id', async () => {
      vi.spyOn(mockPrisma.doctorProfile, 'create').mockRejectedValue({
        code: 'P2002',
        meta: { target: ['user_id'] },
      });

      await expect(
        repository.createProfile({
          userId: 'user-uuid-1',
          publicDoctorId: 'DOC-123456',
          displayName: 'Dr. Jane Smith',
          medicalRegistrationNumber: 'MED-REG-101',
          licensingCouncil: 'Medical Council',
        }),
      ).rejects.toThrow(new ConflictError('A doctor profile already exists for this user account'));
    });

    it('should throw ConflictError on duplicate medical_registration_number', async () => {
      vi.spyOn(mockPrisma.doctorProfile, 'create').mockRejectedValue({
        code: 'P2002',
        meta: { target: ['medical_registration_number'] },
      });

      await expect(
        repository.createProfile({
          userId: 'user-uuid-1',
          publicDoctorId: 'DOC-123456',
          displayName: 'Dr. Jane Smith',
          medicalRegistrationNumber: 'MED-REG-101',
          licensingCouncil: 'Medical Council',
        }),
      ).rejects.toThrow(new ConflictError('Medical registration number is already registered'));
    });

    it('should throw ConflictError on duplicate public_doctor_id', async () => {
      vi.spyOn(mockPrisma.doctorProfile, 'create').mockRejectedValue({
        code: 'P2002',
        meta: { target: ['public_doctor_id'] },
      });

      await expect(
        repository.createProfile({
          userId: 'user-uuid-1',
          publicDoctorId: 'DOC-123456',
          displayName: 'Dr. Jane Smith',
          medicalRegistrationNumber: 'MED-REG-101',
          licensingCouncil: 'Medical Council',
        }),
      ).rejects.toThrow(new ConflictError('Public doctor ID collision detected'));
    });

    it('should throw generic ConflictError on other P2002 target', async () => {
      vi.spyOn(mockPrisma.doctorProfile, 'create').mockRejectedValue({
        code: 'P2002',
        meta: { target: ['other_field'] },
      });

      await expect(
        repository.createProfile({
          userId: 'user-uuid-1',
          publicDoctorId: 'DOC-123456',
          displayName: 'Dr. Jane Smith',
          medicalRegistrationNumber: 'MED-REG-101',
          licensingCouncil: 'Medical Council',
        }),
      ).rejects.toThrow(new ConflictError('Unique constraint violation on doctor profile'));
    });

    it('should rethrow unknown errors', async () => {
      vi.spyOn(mockPrisma.doctorProfile, 'create').mockRejectedValue(new Error('DB failure'));

      await expect(
        repository.createProfile({
          userId: 'user-uuid-1',
          publicDoctorId: 'DOC-123456',
          displayName: 'Dr. Jane Smith',
          medicalRegistrationNumber: 'MED-REG-101',
          licensingCouncil: 'Medical Council',
        }),
      ).rejects.toThrow('DB failure');
    });
  });

  describe('findById, findByUserId, findByPublicId, findByRegistrationNumber', () => {
    it('should find by id', async () => {
      const res = await repository.findById('doc-uuid-1');
      expect(res?.id).toBe('doc-uuid-1');

      vi.spyOn(mockPrisma.doctorProfile, 'findUnique').mockResolvedValue(null);
      const notFound = await repository.findById('doc-uuid-1');
      expect(notFound).toBeNull();
    });

    it('should find by user id', async () => {
      const res = await repository.findByUserId('user-uuid-1');
      expect(res?.id).toBe('doc-uuid-1');

      vi.spyOn(mockPrisma.doctorProfile, 'findUnique').mockResolvedValue(null);
      const notFound = await repository.findByUserId('user-uuid-1');
      expect(notFound).toBeNull();
    });

    it('should find by public id', async () => {
      const res = await repository.findByPublicId('DOC-123456');
      expect(res?.id).toBe('doc-uuid-1');

      vi.spyOn(mockPrisma.doctorProfile, 'findUnique').mockResolvedValue(null);
      const notFound = await repository.findByPublicId('DOC-123456');
      expect(notFound).toBeNull();
    });

    it('should find by registration number', async () => {
      const res = await repository.findByRegistrationNumber('MED-REG-101');
      expect(res?.id).toBe('doc-uuid-1');

      vi.spyOn(mockPrisma.doctorProfile, 'findUnique').mockResolvedValue(null);
      const notFound = await repository.findByRegistrationNumber('MED-REG-101');
      expect(notFound).toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('should throw NotFoundError if doctor profile does not exist', async () => {
      vi.spyOn(mockPrisma.doctorProfile, 'findUnique').mockResolvedValue(null);

      await expect(
        repository.updateProfile('non-existent', { displayName: 'New Name' }),
      ).rejects.toThrow(new NotFoundError("Doctor profile with ID 'non-existent' not found"));
    });

    it('should update profile and replace relations in transaction', async () => {
      const res = await repository.updateProfile('doc-uuid-1', {
        displayName: 'Updated Name',
        specialties: [{ specialtyId: 'spec-2', isPrimary: true }],
        languages: [{ languageId: 'lang-2' }],
        qualifications: [{ qualification: 'Fellowship', institution: 'Oxford' }],
      });

      expect(res.id).toBe('doc-uuid-1');
      expect(mockPrisma.doctorSpecialty.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.doctorSpecialty.createMany).toHaveBeenCalled();
      expect(mockPrisma.doctorLanguage.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.doctorLanguage.createMany).toHaveBeenCalled();
      expect(mockPrisma.doctorQualification.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.doctorQualification.createMany).toHaveBeenCalled();
    });
  });

  describe('updateVerificationStatus', () => {
    it('should throw NotFoundError if doctor not found', async () => {
      vi.spyOn(mockPrisma.doctorProfile, 'findUnique').mockResolvedValue(null);

      await expect(
        repository.updateVerificationStatus('non-existent', VerificationStatus.VERIFIED),
      ).rejects.toThrow(new NotFoundError("Doctor profile with ID 'non-existent' not found"));
    });

    it('should update status and verifiedAt', async () => {
      const now = new Date();
      const res = await repository.updateVerificationStatus(
        'doc-uuid-1',
        VerificationStatus.VERIFIED,
        now,
      );
      expect(res.id).toBe('doc-uuid-1');
      expect(mockPrisma.doctorProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            verificationStatus: VerificationStatus.VERIFIED,
            verifiedAt: now,
          }),
        }),
      );
    });
  });

  describe('findPublicDoctors', () => {
    it('should query with specialty, language and pagination', async () => {
      const res = await repository.findPublicDoctors({
        specialty: 'Cardio',
        language: 'en',
        offset: 0,
        limit: 10,
      });

      expect(res.doctors).toHaveLength(1);
      expect(res.total).toBe(1);
      expect(mockPrisma.doctorProfile.findMany).toHaveBeenCalled();
    });
  });

  describe('taxonomies', () => {
    it('should find active specialties, specialty by id and by code', async () => {
      const all = await repository.findActiveSpecialties();
      expect(all).toHaveLength(1);

      const byId = await repository.findSpecialtyById('spec-1');
      expect(byId?.id).toBe('spec-1');

      const byCode = await repository.findSpecialtyByCode('CARDIO');
      expect(byCode?.code).toBe('CARDIO');

      vi.spyOn(mockPrisma.specialty, 'findUnique').mockResolvedValue(null);
      expect(await repository.findSpecialtyById('spec-none')).toBeNull();
      expect(await repository.findSpecialtyByCode('NONE')).toBeNull();
    });

    it('should find all languages, language by id and by code', async () => {
      const all = await repository.findAllLanguages();
      expect(all).toHaveLength(1);

      const byId = await repository.findLanguageById('lang-1');
      expect(byId?.id).toBe('lang-1');

      const byCode = await repository.findLanguageByCode('en');
      expect(byCode?.code).toBe('en');

      vi.spyOn(mockPrisma.language, 'findUnique').mockResolvedValue(null);
      expect(await repository.findLanguageById('lang-none')).toBeNull();
      expect(await repository.findLanguageByCode('NONE')).toBeNull();
    });
  });
});

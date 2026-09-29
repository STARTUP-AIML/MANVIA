// ==============================================================================
// MANVIA — PatientService Unit Tests
// ==============================================================================
// Phase 6: Patient Profile Business Logic Validation
// ==============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PatientService } from '../../src/modules/patient/services/patient.service.js';
import type { PatientProfileRepository } from '../../src/modules/patient/repositories/patient-profile.repository.js';
import type { UserService } from '../../src/modules/identity/user.service.js';
import type { AuthAuditService } from '../../src/modules/auth/services/auth-audit.service.js';
import { BiologicalSex } from '@prisma/client';
import { NotFoundError, ConflictError } from '../../src/common/errors/app-error.js';

describe('PatientService', () => {
  let service: PatientService;
  let patientProfileRepo: PatientProfileRepository;
  let userService: UserService;
  let auditService: AuthAuditService;

  const mockProfile = {
    id: 'prof-uuid-1',
    userId: 'user-uuid-1',
    publicPatientId: 'PAT-ABC12345',
    legalFirstName: 'Priya',
    legalLastName: 'Sharma',
    dateOfBirth: new Date('1990-05-15'),
    biologicalSex: BiologicalSex.FEMALE,
    bloodGroup: 'B+',
    emergencyContactName: 'Anil Sharma',
    emergencyContactPhone: '+14155552671',
    emergencyContactRelationship: 'SPOUSE',
    preferredLanguage: 'en',
    timezone: 'Asia/Kolkata',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    patientProfileRepo = {
      create: vi.fn().mockResolvedValue(mockProfile),
      findByUserId: vi.fn(),
      findByPublicId: vi.fn(),
      findById: vi.fn(),
      updateByUserId: vi.fn().mockResolvedValue({
        ...mockProfile,
        preferredLanguage: 'hi',
      }),
      deleteByUserId: vi.fn(),
    } as unknown as PatientProfileRepository;

    userService = {
      findById: vi.fn().mockResolvedValue({ id: 'user-uuid-1', email: 'test@example.com' }),
    } as unknown as UserService;

    auditService = {
      logEvent: vi.fn().mockResolvedValue(undefined),
    } as unknown as AuthAuditService;

    service = new PatientService(patientProfileRepo, userService, auditService);
  });

  describe('createProfile', () => {
    it('should successfully create a patient profile and log audit event', async () => {
      vi.spyOn(patientProfileRepo, 'findByUserId').mockResolvedValue(null);

      const result = await service.createProfile('user-uuid-1', {
        legalFirstName: 'Priya',
        legalLastName: 'Sharma',
        biologicalSex: BiologicalSex.FEMALE,
        preferredLanguage: 'en',
      });

      expect(result.id).toBe('prof-uuid-1');
      expect(patientProfileRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-uuid-1',
          legalFirstName: 'Priya',
          legalLastName: 'Sharma',
          biologicalSex: BiologicalSex.FEMALE,
          preferredLanguage: 'en',
        }),
      );
      expect(auditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PATIENT.PROFILE_CREATED',
          actorUserId: 'user-uuid-1',
          status: 'SUCCESS',
        }),
      );
    });

    it('should throw NotFoundError if user identity does not exist', async () => {
      vi.spyOn(userService, 'findById').mockResolvedValue(null);

      await expect(service.createProfile('non-existent-user')).rejects.toThrow(
        new NotFoundError('User identity not found'),
      );
    });

    it('should throw ConflictError if patient profile already exists for user', async () => {
      vi.spyOn(patientProfileRepo, 'findByUserId').mockResolvedValue(mockProfile);

      await expect(service.createProfile('user-uuid-1')).rejects.toThrow(
        new ConflictError('Patient profile already exists for this user'),
      );
    });
  });

  describe('getProfileByUserId', () => {
    it('should return profile when profile exists', async () => {
      vi.spyOn(patientProfileRepo, 'findByUserId').mockResolvedValue(mockProfile);

      const result = await service.getProfileByUserId('user-uuid-1');
      expect(result.id).toBe('prof-uuid-1');
      expect(result.publicPatientId).toBe('PAT-ABC12345');
    });

    it('should throw NotFoundError when profile does not exist', async () => {
      vi.spyOn(patientProfileRepo, 'findByUserId').mockResolvedValue(null);

      await expect(service.getProfileByUserId('user-uuid-1')).rejects.toThrow(
        new NotFoundError('Patient profile not found'),
      );
    });
  });

  describe('getProfileByPublicId', () => {
    it('should return profile when matching publicPatientId exists', async () => {
      vi.spyOn(patientProfileRepo, 'findByPublicId').mockResolvedValue(mockProfile);

      const result = await service.getProfileByPublicId('PAT-ABC12345');
      expect(result.id).toBe('prof-uuid-1');
    });

    it('should throw NotFoundError when publicPatientId does not exist', async () => {
      vi.spyOn(patientProfileRepo, 'findByPublicId').mockResolvedValue(null);

      await expect(service.getProfileByPublicId('PAT-NONEXISTENT')).rejects.toThrow(
        new NotFoundError('Patient profile not found'),
      );
    });
  });

  describe('updateProfile', () => {
    it('should update permitted fields and log audit event', async () => {
      vi.spyOn(patientProfileRepo, 'findByUserId').mockResolvedValue(mockProfile);

      const result = await service.updateProfile('user-uuid-1', {
        preferredLanguage: 'hi',
      });

      expect(result.preferredLanguage).toBe('hi');
      expect(patientProfileRepo.updateByUserId).toHaveBeenCalledWith(
        'user-uuid-1',
        expect.objectContaining({
          preferredLanguage: 'hi',
        }),
      );
      expect(auditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PATIENT.PROFILE_UPDATED',
          actorUserId: 'user-uuid-1',
          status: 'SUCCESS',
        }),
      );
    });

    it('should throw NotFoundError when updating non-existent profile', async () => {
      vi.spyOn(patientProfileRepo, 'findByUserId').mockResolvedValue(null);

      await expect(
        service.updateProfile('user-uuid-1', { preferredLanguage: 'es' }),
      ).rejects.toThrow(new NotFoundError('Patient profile not found'));
    });
  });
});

// ==============================================================================
// MANVIA — PatientController Unit Tests
// ==============================================================================
// Phase 6: Patient Controller Endpoint Validation
// ==============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PatientController } from '../../src/modules/patient/patient.controller.js';
import type { PatientService } from '../../src/modules/patient/services/patient.service.js';
import { BiologicalSex, Role } from '@prisma/client';
import type { AuthenticatedUser } from '../../src/modules/auth/auth.interface.js';

describe('PatientController', () => {
  let controller: PatientController;
  let patientService: PatientService;

  const mockUser: AuthenticatedUser = {
    id: 'user-uuid-1',
    email: 'patient@example.com',
    roles: [Role.PATIENT],
    activeRole: Role.PATIENT,
    sessionId: 'sess-1',
  };

  const mockProfile = {
    id: 'prof-uuid-1',
    userId: 'user-uuid-1',
    publicPatientId: 'PAT-48291048',
    legalFirstName: 'Priya',
    legalLastName: 'Sharma',
    dateOfBirth: new Date('1984-06-15'),
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
    patientService = {
      getProfileByUserId: vi.fn().mockResolvedValue(mockProfile),
      createProfile: vi.fn().mockResolvedValue(mockProfile),
      updateProfile: vi.fn().mockResolvedValue({
        ...mockProfile,
        preferredLanguage: 'hi',
      }),
    } as unknown as PatientService;

    controller = new PatientController(patientService);
  });

  describe('getMyProfile', () => {
    it('should return patient profile response for authenticated user', async () => {
      const res = await controller.getMyProfile(mockUser);
      expect(res.id).toBe('prof-uuid-1');
      expect(res.publicPatientId).toBe('PAT-48291048');
      expect(res.legalFirstName).toBe('Priya');
      expect(res.emergencyContact?.name).toBe('Anil Sharma');
      expect(patientService.getProfileByUserId).toHaveBeenCalledWith('user-uuid-1');
    });
  });

  describe('createMyProfile', () => {
    it('should create and return patient profile response for authenticated user', async () => {
      const dto = {
        legalFirstName: 'Priya',
        legalLastName: 'Sharma',
        biologicalSex: BiologicalSex.FEMALE,
      };

      const res = await controller.createMyProfile(mockUser, dto);
      expect(res.id).toBe('prof-uuid-1');
      expect(patientService.createProfile).toHaveBeenCalledWith('user-uuid-1', dto);
    });
  });

  describe('updateMyProfile', () => {
    it('should update and return updated patient profile response', async () => {
      const dto = { preferredLanguage: 'hi' };
      const res = await controller.updateMyProfile(mockUser, dto);
      expect(res.preferredLanguage).toBe('hi');
      expect(patientService.updateProfile).toHaveBeenCalledWith('user-uuid-1', dto);
    });
  });
});

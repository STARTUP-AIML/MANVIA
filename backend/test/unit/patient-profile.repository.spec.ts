// ==============================================================================
// MANVIA — PatientProfileRepository Unit Tests
// ==============================================================================
// Phase 6: Patient Profile Repository Unit Tests
// ==============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PatientProfileRepository } from '../../src/modules/patient/repositories/patient-profile.repository.js';
import type { PrismaService } from '../../src/database/prisma.service.js';
import { BiologicalSex } from '@prisma/client';

interface MockPrismaPatient {
  patientProfile: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
}

describe('PatientProfileRepository', () => {
  let repository: PatientProfileRepository;
  let mockPrisma: MockPrismaPatient;

  beforeEach(() => {
    mockPrisma = {
      patientProfile: {
        create: vi.fn().mockResolvedValue({
          id: 'prof-1',
          userId: 'user-1',
          publicPatientId: 'PAT-A1B2C3D4',
        }),
        findUnique: vi.fn(),
        update: vi.fn().mockResolvedValue({
          id: 'prof-1',
          userId: 'user-1',
          legalFirstName: 'Jane',
        }),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };

    repository = new PatientProfileRepository(mockPrisma as unknown as PrismaService);
  });

  it('should create patient profile with generated public patient ID if not provided', async () => {
    const res = await repository.create({
      userId: 'user-1',
      legalFirstName: 'John',
      legalLastName: 'Doe',
      biologicalSex: BiologicalSex.MALE,
    });

    expect(res.id).toBe('prof-1');
    expect(mockPrisma.patientProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          legalFirstName: 'John',
          legalLastName: 'Doe',
          publicPatientId: expect.stringMatching(/^PAT-[0-9A-F]{8}$/),
        }),
      }),
    );
  });

  it('should find patient profile by userId', async () => {
    mockPrisma.patientProfile.findUnique.mockResolvedValue({ id: 'prof-1', userId: 'user-1' });

    const res = await repository.findByUserId('user-1');
    expect(res?.id).toBe('prof-1');
    expect(mockPrisma.patientProfile.findUnique).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
  });

  it('should find patient profile by publicPatientId', async () => {
    mockPrisma.patientProfile.findUnique.mockResolvedValue({
      id: 'prof-1',
      publicPatientId: 'PAT-A1B2C3D4',
    });

    const res = await repository.findByPublicId('PAT-A1B2C3D4');
    expect(res?.id).toBe('prof-1');
    expect(mockPrisma.patientProfile.findUnique).toHaveBeenCalledWith({
      where: { publicPatientId: 'PAT-A1B2C3D4' },
    });
  });

  it('should find patient profile by internal primary key id', async () => {
    mockPrisma.patientProfile.findUnique.mockResolvedValue({ id: 'prof-1' });

    const res = await repository.findById('prof-1');
    expect(res?.id).toBe('prof-1');
    expect(mockPrisma.patientProfile.findUnique).toHaveBeenCalledWith({
      where: { id: 'prof-1' },
    });
  });

  it('should update patient profile by userId', async () => {
    const res = await repository.updateByUserId('user-1', {
      legalFirstName: 'Jane',
      preferredLanguage: 'es',
    });

    expect(res.legalFirstName).toBe('Jane');
    expect(mockPrisma.patientProfile.update).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: expect.objectContaining({
        legalFirstName: 'Jane',
        preferredLanguage: 'es',
      }),
    });
  });

  it('should delete patient profile by userId', async () => {
    const res = await repository.deleteByUserId('user-1');
    expect(res).toBe(true);
    expect(mockPrisma.patientProfile.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
  });

  it('should return false if deleteByUserId finds no records', async () => {
    mockPrisma.patientProfile.deleteMany.mockResolvedValue({ count: 0 });
    const res = await repository.deleteByUserId('user-1');
    expect(res).toBe(false);
  });

  it('should support withTransaction returning instance bound to transaction', () => {
    const txRepo = repository.withTransaction(
      {} as unknown as Parameters<typeof repository.withTransaction>[0],
    );
    expect(txRepo).toBeInstanceOf(PatientProfileRepository);
  });
});

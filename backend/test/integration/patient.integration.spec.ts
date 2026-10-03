// ==============================================================================
// MANVIA — Patient Database Integration Tests
// ==============================================================================
// Phase 6: PostgreSQL 18 + Prisma Schema & Constraint Integration Tests
// ==============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApp } from '../../src/main.js';
import { PrismaService } from '../../src/database/prisma.service.js';
import { PatientProfileRepository } from '../../src/modules/patient/repositories/patient-profile.repository.js';
import { BiologicalSex } from '@prisma/client';

describe('Patient Database Integration (PostgreSQL 18)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let repository: PatientProfileRepository;

  const testUserEmail = `patient_integration_${Date.now()}@example.com`;
  let testUserId: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    app = await createApp();
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    prisma = app.get(PrismaService);
    repository = app.get(PatientProfileRepository);

    // Create a central user identity for the integration test
    const user = await prisma.user.create({
      data: {
        email: testUserEmail,
        status: 'ACTIVE',
        roles: ['PATIENT'],
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({
        where: { email: { contains: 'patient_integration_' } },
      });
    }
    if (app) {
      await app.close();
    }
  });

  it('should persist PatientProfile in PostgreSQL with 1-to-1 relationship to User', async () => {
    const profile = await repository.create({
      userId: testUserId,
      legalFirstName: 'Aarav',
      legalLastName: 'Patel',
      dateOfBirth: new Date('1992-08-20'),
      biologicalSex: BiologicalSex.MALE,
      bloodGroup: 'O+',
      emergencyContactName: 'Geeta Patel',
      emergencyContactPhone: '+14155558912',
      emergencyContactRelationship: 'MOTHER',
      preferredLanguage: 'en',
      timezone: 'Asia/Kolkata',
    });

    expect(profile.id).toBeDefined();
    expect(profile.userId).toBe(testUserId);
    expect(profile.publicPatientId).toMatch(/^PAT-[0-9A-F]{8}$/);
    expect(profile.legalFirstName).toBe('Aarav');
    expect(profile.bloodGroup).toBe('O+');
  });

  it('should enforce 1-to-1 uniqueness constraint on userId at database level', async () => {
    // Attempting to insert a second PatientProfile for the same userId must fail
    await expect(
      repository.create({
        userId: testUserId,
        legalFirstName: 'Duplicate',
        legalLastName: 'Attempt',
      }),
    ).rejects.toThrow();
  });

  it('should find patient profile by userId and by publicPatientId', async () => {
    const byUser = await repository.findByUserId(testUserId);
    expect(byUser).not.toBeNull();
    expect(byUser?.userId).toBe(testUserId);

    const byPublic = await repository.findByPublicId(byUser!.publicPatientId);
    expect(byPublic).not.toBeNull();
    expect(byPublic?.id).toBe(byUser?.id);
  });

  it('should update permitted fields in PostgreSQL', async () => {
    const updated = await repository.updateByUserId(testUserId, {
      preferredLanguage: 'gu',
      timezone: 'UTC',
    });

    expect(updated.preferredLanguage).toBe('gu');
    expect(updated.timezone).toBe('UTC');

    const fresh = await repository.findByUserId(testUserId);
    expect(fresh?.preferredLanguage).toBe('gu');
  });

  it('should cascade delete PatientProfile when User identity is deleted', async () => {
    // Create temporary user and profile
    const tempUser = await prisma.user.create({
      data: {
        email: `temp_cascade_${Date.now()}@example.com`,
        status: 'ACTIVE',
        roles: ['PATIENT'],
      },
    });

    const tempProfile = await repository.create({
      userId: tempUser.id,
      legalFirstName: 'Temp',
      legalLastName: 'Cascade',
    });

    expect(await repository.findById(tempProfile.id)).not.toBeNull();

    // Delete User
    await prisma.user.delete({
      where: { id: tempUser.id },
    });

    // PatientProfile must be deleted via CASCADE
    const deletedProfile = await repository.findById(tempProfile.id);
    expect(deletedProfile).toBeNull();
  });
});

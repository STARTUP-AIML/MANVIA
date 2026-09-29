import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryWellnessRepository } from '../../src/modules/wellness/repositories/in-memory-wellness.repository.js';
import { PrismaWellnessRepository } from '../../src/modules/wellness/repositories/prisma-wellness.repository.js';

describe('Wellness Engine Integration Tests', () => {
  let memoryRepo: InMemoryWellnessRepository;
  const PATIENT_ID = 'pat-uuid-integ-1';

  beforeEach(() => {
    memoryRepo = new InMemoryWellnessRepository();
  });

  describe('InMemoryWellnessRepository Contract', () => {
    it('should create and retrieve check-ins preserving metric fidelity', async () => {
      const created = await memoryRepo.createCheckIn({
        patientId: PATIENT_ID,
        mood: 4,
        stress: 2,
        energy: 4,
        sleepQuality: 5,
        sleepDurationMinutes: 480,
        note: 'Solid 8 hours of sleep.',
      });

      expect(created.id).toBeDefined();
      expect(created.patientId).toBe(PATIENT_ID);
      expect(created.mood).toBe(4);
      expect(created.stress).toBe(2);
      expect(created.energy).toBe(4);
      expect(created.sleepQuality).toBe(5);
      expect(created.sleepDurationMinutes).toBe(480);
      expect(created.note).toBe('Solid 8 hours of sleep.');

      const fetched = await memoryRepo.findById(created.id);
      expect(fetched).toEqual(created);

      const patientFetched = await memoryRepo.findPatientCheckInById(PATIENT_ID, created.id);
      expect(patientFetched).toEqual(created);

      const wrongPatientFetched = await memoryRepo.findPatientCheckInById(
        'other-patient-id',
        created.id,
      );
      expect(wrongPatientFetched).toBeNull();
    });

    it('should query check-ins with pagination and date boundaries', async () => {
      // Create 5 check-ins across multiple dates
      for (let i = 1; i <= 5; i++) {
        await memoryRepo.createCheckIn({
          patientId: PATIENT_ID,
          mood: i,
          stress: 6 - i,
          energy: i,
          sleepQuality: i,
          recordedAt: new Date(Date.now() - (5 - i) * 24 * 60 * 60 * 1000),
        });
      }

      const page1 = await memoryRepo.findCheckIns({
        patientId: PATIENT_ID,
        page: 1,
        limit: 2,
      });

      expect(page1.total).toBe(5);
      expect(page1.data).toHaveLength(2);
      // Newest first
      expect(page1.data[0]?.mood).toBe(5);
      expect(page1.data[1]?.mood).toBe(4);

      const page2 = await memoryRepo.findCheckIns({
        patientId: PATIENT_ID,
        page: 2,
        limit: 2,
      });

      expect(page2.data).toHaveLength(2);
      expect(page2.data[0]?.mood).toBe(3);
      expect(page2.data[1]?.mood).toBe(2);
    });

    it('should update check-in fields selectively', async () => {
      const created = await memoryRepo.createCheckIn({
        patientId: PATIENT_ID,
        mood: 3,
        stress: 3,
        energy: 3,
        sleepQuality: 3,
        note: 'Original note',
      });

      const updated = await memoryRepo.updateCheckIn(created.id, {
        mood: 5,
        note: 'Updated note',
      });

      expect(updated.mood).toBe(5);
      expect(updated.note).toBe('Updated note');
      expect(updated.stress).toBe(3); // untouched
    });

    it('should delete check-in and verify removal', async () => {
      const created = await memoryRepo.createCheckIn({
        patientId: PATIENT_ID,
        mood: 4,
        stress: 2,
        energy: 4,
        sleepQuality: 4,
      });

      await memoryRepo.deleteCheckIn(created.id);
      const after = await memoryRepo.findById(created.id);
      expect(after).toBeNull();
    });
  });

  describe('PrismaWellnessRepository Delegation Verification', () => {
    interface MockWellnessRecord {
      id: string;
      patientId: string;
      mood: number;
      stress: number;
      energy: number;
      sleepQuality: number;
      sleepDurationMinutes: number | null;
      note: string | null;
      recordedAt: Date;
      createdAt: Date;
      updatedAt: Date;
    }

    it('should delegate create, findUnique, findMany, count, update, delete through Prisma delegates', async () => {
      const mockRecords: MockWellnessRecord[] = [];

      const mockPrisma = {
        wellnessCheckIn: {
          create: async (args: { data: Record<string, unknown> }): Promise<MockWellnessRecord> => {
            const row: MockWellnessRecord = {
              id: 'prisma-uuid-001',
              patientId: String(args.data['patientId']),
              mood: Number(args.data['mood']),
              stress: Number(args.data['stress']),
              energy: Number(args.data['energy']),
              sleepQuality: Number(args.data['sleepQuality']),
              sleepDurationMinutes: (args.data['sleepDurationMinutes'] as number | null) ?? null,
              note: (args.data['note'] as string | null) ?? null,
              recordedAt: (args.data['recordedAt'] as Date) ?? new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            mockRecords.push(row);
            return row;
          },
          findUnique: async (args: {
            where: { id: string };
          }): Promise<MockWellnessRecord | null> => {
            return mockRecords.find((r) => r.id === args.where.id) ?? null;
          },
          findMany: async (args?: {
            where?: { patientId?: string };
            take?: number;
            skip?: number;
          }): Promise<MockWellnessRecord[]> => {
            let res = [...mockRecords];
            if (args?.where?.patientId) {
              res = res.filter((r) => r.patientId === args.where?.patientId);
            }
            if (args?.take) {
              res = res.slice(args.skip ?? 0, (args.skip ?? 0) + args.take);
            }
            return res;
          },
          count: async (args?: { where?: { patientId?: string } }): Promise<number> => {
            if (args?.where?.patientId) {
              return mockRecords.filter((r) => r.patientId === args.where?.patientId).length;
            }
            return mockRecords.length;
          },
          update: async (args: {
            where: { id: string };
            data: Record<string, unknown>;
          }): Promise<MockWellnessRecord> => {
            const idx = mockRecords.findIndex((r) => r.id === args.where.id);
            if (idx === -1) throw new Error('Not found');
            const current = mockRecords[idx]!;
            const updated: MockWellnessRecord = {
              ...current,
              ...(args.data['mood'] !== undefined ? { mood: Number(args.data['mood']) } : {}),
              updatedAt: new Date(),
            };
            mockRecords[idx] = updated;
            return updated;
          },
          delete: async (args: { where: { id: string } }): Promise<MockWellnessRecord> => {
            const idx = mockRecords.findIndex((r) => r.id === args.where.id);
            if (idx === -1) throw new Error('Not found');
            const removed = mockRecords.splice(idx, 1)[0]!;
            return removed;
          },
        },
      };

      const prismaRepo = new PrismaWellnessRepository(mockPrisma);

      const created = await prismaRepo.createCheckIn({
        patientId: PATIENT_ID,
        mood: 5,
        stress: 1,
        energy: 5,
        sleepQuality: 5,
        note: 'Prisma test log',
      });

      expect(created.id).toBe('prisma-uuid-001');
      expect(created.mood).toBe(5);

      const found = await prismaRepo.findById('prisma-uuid-001');
      expect(found?.note).toBe('Prisma test log');

      const count = await prismaRepo.countCheckIns(PATIENT_ID);
      expect(count).toBe(1);

      const updated = await prismaRepo.updateCheckIn('prisma-uuid-001', { mood: 4 });
      expect(updated.mood).toBe(4);

      await prismaRepo.deleteCheckIn('prisma-uuid-001');
      const countAfter = await prismaRepo.countCheckIns(PATIENT_ID);
      expect(countAfter).toBe(0);
    });
  });
});

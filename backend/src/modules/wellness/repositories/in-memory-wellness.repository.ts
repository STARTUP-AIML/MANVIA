import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { NotFoundError } from '../../../common/errors/app-error.js';
import type {
  CreateWellnessCheckInInput,
  IWellnessRepository,
  UpdateWellnessCheckInInput,
  WellnessQueryOptions,
} from '../interfaces/wellness-repository.interface.js';
import type { WellnessCheckInEntity } from '../entities/wellness-check-in.entity.js';

@Injectable()
export class InMemoryWellnessRepository implements IWellnessRepository {
  private checkIns: Map<string, WellnessCheckInEntity> = new Map();

  public async createCheckIn(input: CreateWellnessCheckInInput): Promise<WellnessCheckInEntity> {
    const id = randomUUID();
    const now = new Date();
    const recordedAt = input.recordedAt ? new Date(input.recordedAt) : now;

    const record: WellnessCheckInEntity = {
      id,
      patientId: input.patientId,
      mood: input.mood,
      stress: input.stress,
      energy: input.energy,
      sleepQuality: input.sleepQuality,
      sleepDurationMinutes: input.sleepDurationMinutes ?? null,
      note: input.note ?? null,
      recordedAt,
      createdAt: now,
      updatedAt: now,
    };

    this.checkIns.set(id, record);
    return { ...record };
  }

  public async findById(id: string): Promise<WellnessCheckInEntity | null> {
    const found = this.checkIns.get(id);
    return found ? { ...found } : null;
  }

  public async findPatientCheckInById(
    patientId: string,
    id: string,
  ): Promise<WellnessCheckInEntity | null> {
    const found = this.checkIns.get(id);
    if (!found || found.patientId !== patientId) {
      return null;
    }
    return { ...found };
  }

  public async findCheckIns(
    options: WellnessQueryOptions,
  ): Promise<{ data: WellnessCheckInEntity[]; total: number }> {
    const { patientId, startDate, endDate, page = 1, limit = 20 } = options;

    let items = Array.from(this.checkIns.values()).filter((item) => item.patientId === patientId);

    if (startDate) {
      items = items.filter((item) => item.recordedAt >= startDate);
    }
    if (endDate) {
      items = items.filter((item) => item.recordedAt <= endDate);
    }

    // Sort descending by recordedAt
    items.sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());

    const total = items.length;
    const startIndex = (page - 1) * limit;
    const paginated = items.slice(startIndex, startIndex + limit).map((i) => ({ ...i }));

    return { data: paginated, total };
  }

  public async findLatestCheckIn(patientId: string): Promise<WellnessCheckInEntity | null> {
    const items = Array.from(this.checkIns.values())
      .filter((item) => item.patientId === patientId)
      .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());

    const first = items[0];
    return first ? { ...first } : null;
  }

  public async findCheckInsBetween(
    patientId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<WellnessCheckInEntity[]> {
    const items = Array.from(this.checkIns.values())
      .filter(
        (item) =>
          item.patientId === patientId &&
          item.recordedAt >= startDate &&
          item.recordedAt <= endDate,
      )
      .sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());

    return items.map((i) => ({ ...i }));
  }

  public async updateCheckIn(
    id: string,
    input: UpdateWellnessCheckInInput,
  ): Promise<WellnessCheckInEntity> {
    const existing = this.checkIns.get(id);
    if (!existing) {
      throw new NotFoundError('Wellness check-in not found');
    }

    const updated: WellnessCheckInEntity = {
      ...existing,
      ...(input.mood !== undefined ? { mood: input.mood } : {}),
      ...(input.stress !== undefined ? { stress: input.stress } : {}),
      ...(input.energy !== undefined ? { energy: input.energy } : {}),
      ...(input.sleepQuality !== undefined ? { sleepQuality: input.sleepQuality } : {}),
      ...(input.sleepDurationMinutes !== undefined
        ? { sleepDurationMinutes: input.sleepDurationMinutes }
        : {}),
      ...(input.note !== undefined ? { note: input.note } : {}),
      ...(input.recordedAt !== undefined ? { recordedAt: new Date(input.recordedAt) } : {}),
      updatedAt: new Date(),
    };

    this.checkIns.set(id, updated);
    return { ...updated };
  }

  public async deleteCheckIn(id: string): Promise<void> {
    const existing = this.checkIns.get(id);
    if (!existing) {
      throw new NotFoundError('Wellness check-in not found');
    }
    this.checkIns.delete(id);
  }

  public async countCheckIns(patientId: string): Promise<number> {
    let count = 0;
    for (const item of this.checkIns.values()) {
      if (item.patientId === patientId) {
        count++;
      }
    }
    return count;
  }

  public reset(): void {
    this.checkIns.clear();
  }
}

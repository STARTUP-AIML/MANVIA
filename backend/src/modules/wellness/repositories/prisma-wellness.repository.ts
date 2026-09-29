import { Injectable, Optional } from '@nestjs/common';
import { NotFoundError } from '../../../common/errors/app-error.js';
import type {
  CreateWellnessCheckInInput,
  IWellnessRepository,
  UpdateWellnessCheckInInput,
  WellnessQueryOptions,
} from '../interfaces/wellness-repository.interface.js';
import type { WellnessCheckInEntity } from '../entities/wellness-check-in.entity.js';

interface RawWellnessCheckIn {
  id: string;
  patientId: string;
  mood: number;
  stress: number;
  energy: number;
  sleepQuality: number;
  sleepDurationMinutes: number | null;
  note: string | null;
  recordedAt: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface PrismaModelDelegate<T = Record<string, unknown>> {
  create(args: { data: Record<string, unknown> }): Promise<T>;
  findUnique(args: { where: Record<string, unknown> }): Promise<T | null>;
  findFirst?(args: { where: Record<string, unknown> }): Promise<T | null>;
  findMany(args?: {
    where?: Record<string, unknown>;
    orderBy?: Record<string, 'asc' | 'desc'> | Array<Record<string, 'asc' | 'desc'>>;
    skip?: number;
    take?: number;
  }): Promise<T[]>;
  update(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<T>;
  delete?(args: { where: Record<string, unknown> }): Promise<T>;
  count?(args?: { where?: Record<string, unknown> }): Promise<number>;
}

interface PrismaClientLike {
  wellnessCheckIn: PrismaModelDelegate<RawWellnessCheckIn>;
}

@Injectable()
export class PrismaWellnessRepository implements IWellnessRepository {
  private readonly prisma: PrismaClientLike | undefined;

  constructor(@Optional() prisma?: PrismaClientLike | undefined) {
    this.prisma = prisma;
  }

  private getClient(): PrismaClientLike {
    if (!this.prisma) {
      throw new Error(
        'PrismaClient is not initialized in PrismaWellnessRepository. Provide a valid Prisma client or use InMemoryWellnessRepository.',
      );
    }
    return this.prisma;
  }

  public async createCheckIn(input: CreateWellnessCheckInInput): Promise<WellnessCheckInEntity> {
    const client = this.getClient();
    const raw = await client.wellnessCheckIn.create({
      data: {
        patientId: input.patientId,
        mood: input.mood,
        stress: input.stress,
        energy: input.energy,
        sleepQuality: input.sleepQuality,
        sleepDurationMinutes: input.sleepDurationMinutes ?? null,
        note: input.note ?? null,
        ...(input.recordedAt ? { recordedAt: input.recordedAt } : {}),
      },
    });

    return this.toEntity(raw);
  }

  public async findById(id: string): Promise<WellnessCheckInEntity | null> {
    const client = this.getClient();
    const raw = await client.wellnessCheckIn.findUnique({ where: { id } });
    return raw ? this.toEntity(raw) : null;
  }

  public async findPatientCheckInById(
    patientId: string,
    id: string,
  ): Promise<WellnessCheckInEntity | null> {
    const client = this.getClient();
    const raw = client.wellnessCheckIn.findFirst
      ? await client.wellnessCheckIn.findFirst({ where: { id, patientId } })
      : await client.wellnessCheckIn.findUnique({ where: { id } });

    if (!raw || raw.patientId !== patientId) {
      return null;
    }
    return this.toEntity(raw);
  }

  public async findCheckIns(
    options: WellnessQueryOptions,
  ): Promise<{ data: WellnessCheckInEntity[]; total: number }> {
    const client = this.getClient();
    const { patientId, startDate, endDate, page = 1, limit = 20 } = options;

    const where: Record<string, unknown> = { patientId };
    if (startDate || endDate) {
      const recordedAtFilter: Record<string, Date> = {};
      if (startDate) recordedAtFilter['gte'] = startDate;
      if (endDate) recordedAtFilter['lte'] = endDate;
      where['recordedAt'] = recordedAtFilter;
    }

    const skip = (page - 1) * limit;
    const [rawItems, total] = await Promise.all([
      client.wellnessCheckIn.findMany({
        where,
        orderBy: { recordedAt: 'desc' },
        skip,
        take: limit,
      }),
      client.wellnessCheckIn.count ? client.wellnessCheckIn.count({ where }) : Promise.resolve(0),
    ]);

    return {
      data: rawItems.map((r) => this.toEntity(r)),
      total: total || rawItems.length,
    };
  }

  public async findLatestCheckIn(patientId: string): Promise<WellnessCheckInEntity | null> {
    const client = this.getClient();
    const rawItems = await client.wellnessCheckIn.findMany({
      where: { patientId },
      orderBy: { recordedAt: 'desc' },
      take: 1,
    });

    const first = rawItems[0];
    return first ? this.toEntity(first) : null;
  }

  public async findCheckInsBetween(
    patientId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<WellnessCheckInEntity[]> {
    const client = this.getClient();
    const rawItems = await client.wellnessCheckIn.findMany({
      where: {
        patientId,
        recordedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { recordedAt: 'asc' },
    });

    return rawItems.map((r) => this.toEntity(r));
  }

  public async updateCheckIn(
    id: string,
    input: UpdateWellnessCheckInInput,
  ): Promise<WellnessCheckInEntity> {
    const client = this.getClient();
    const data: Record<string, unknown> = {};

    if (input.mood !== undefined) data['mood'] = input.mood;
    if (input.stress !== undefined) data['stress'] = input.stress;
    if (input.energy !== undefined) data['energy'] = input.energy;
    if (input.sleepQuality !== undefined) data['sleepQuality'] = input.sleepQuality;
    if (input.sleepDurationMinutes !== undefined)
      data['sleepDurationMinutes'] = input.sleepDurationMinutes;
    if (input.note !== undefined) data['note'] = input.note;
    if (input.recordedAt !== undefined) data['recordedAt'] = input.recordedAt;

    try {
      const raw = await client.wellnessCheckIn.update({
        where: { id },
        data,
      });
      return this.toEntity(raw);
    } catch {
      throw new NotFoundError('Wellness check-in not found');
    }
  }

  public async deleteCheckIn(id: string): Promise<void> {
    const client = this.getClient();
    if (client.wellnessCheckIn.delete) {
      try {
        await client.wellnessCheckIn.delete({ where: { id } });
      } catch {
        throw new NotFoundError('Wellness check-in not found');
      }
    }
  }

  public async countCheckIns(patientId: string): Promise<number> {
    const client = this.getClient();
    if (client.wellnessCheckIn.count) {
      return client.wellnessCheckIn.count({ where: { patientId } });
    }
    const all = await client.wellnessCheckIn.findMany({ where: { patientId } });
    return all.length;
  }

  private toEntity(raw: RawWellnessCheckIn): WellnessCheckInEntity {
    return {
      id: raw.id,
      patientId: raw.patientId,
      mood: raw.mood,
      stress: raw.stress,
      energy: raw.energy,
      sleepQuality: raw.sleepQuality,
      sleepDurationMinutes: raw.sleepDurationMinutes,
      note: raw.note,
      recordedAt: new Date(raw.recordedAt),
      createdAt: new Date(raw.createdAt),
      updatedAt: new Date(raw.updatedAt),
    };
  }
}

import type { WellnessCheckInEntity } from '../entities/wellness-check-in.entity.js';

export interface CreateWellnessCheckInInput {
  patientId: string;
  mood: number;
  stress: number;
  energy: number;
  sleepQuality: number;
  sleepDurationMinutes?: number | null | undefined;
  note?: string | null | undefined;
  recordedAt?: Date | undefined;
}

export interface UpdateWellnessCheckInInput {
  mood?: number | undefined;
  stress?: number | undefined;
  energy?: number | undefined;
  sleepQuality?: number | undefined;
  sleepDurationMinutes?: number | null | undefined;
  note?: string | null | undefined;
  recordedAt?: Date | undefined;
}

export interface WellnessQueryOptions {
  patientId: string;
  startDate?: Date | undefined;
  endDate?: Date | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export interface IWellnessRepository {
  createCheckIn(input: CreateWellnessCheckInInput): Promise<WellnessCheckInEntity>;
  findById(id: string): Promise<WellnessCheckInEntity | null>;
  findPatientCheckInById(patientId: string, id: string): Promise<WellnessCheckInEntity | null>;
  findCheckIns(
    options: WellnessQueryOptions,
  ): Promise<{ data: WellnessCheckInEntity[]; total: number }>;
  findLatestCheckIn(patientId: string): Promise<WellnessCheckInEntity | null>;
  findCheckInsBetween(
    patientId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<WellnessCheckInEntity[]>;
  updateCheckIn(id: string, input: UpdateWellnessCheckInInput): Promise<WellnessCheckInEntity>;
  deleteCheckIn(id: string): Promise<void>;
  countCheckIns(patientId: string): Promise<number>;
}

export const WELLNESS_REPOSITORY = Symbol('WELLNESS_REPOSITORY');

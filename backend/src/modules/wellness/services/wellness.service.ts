import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError, ValidationError } from '../../../common/errors/app-error.js';
import {
  WELLNESS_REPOSITORY,
  type IWellnessRepository,
} from '../interfaces/wellness-repository.interface.js';
import {
  WELLNESS_AUDIT_SERVICE,
  type IWellnessAuditService,
} from '../interfaces/wellness-audit-service.interface.js';
import { CareRelationshipsService } from '../../care-relationships/services/care-relationships.service.js';
import {
  CARE_RELATIONSHIP_REPOSITORY,
  type ICareRelationshipRepository,
} from '../../care-relationships/interfaces/care-relationship-repository.interface.js';
import type {
  CreateWellnessCheckInDto,
  UpdateWellnessCheckInDto,
  WellnessQueryDto,
  WellnessTrendsQueryDto,
} from '../dto/index.js';
import type {
  PaginatedWellnessCheckInsResponseDto,
  WellnessCheckInResponseDto,
  WellnessSummaryResponseDto,
  WellnessTrendsResponseDto,
} from '../dto/index.js';
import type { WellnessCheckInEntity } from '../entities/wellness-check-in.entity.js';

@Injectable()
export class WellnessService {
  constructor(
    @Inject(WELLNESS_REPOSITORY)
    private readonly wellnessRepo: IWellnessRepository,
    @Inject(WELLNESS_AUDIT_SERVICE)
    private readonly auditService: IWellnessAuditService,
    private readonly careRelService: CareRelationshipsService,
    @Inject(CARE_RELATIONSHIP_REPOSITORY)
    private readonly careRelRepo: ICareRelationshipRepository,
  ) {}

  /**
   * Records a new wellness check-in for the authenticated patient.
   */
  public async recordCheckIn(
    userId: string,
    dto: CreateWellnessCheckInDto,
  ): Promise<WellnessCheckInResponseDto> {
    const patient = await this.careRelService.getOrCreatePatientProfile(userId);

    // Compute sleepDurationMinutes from sleepHours if not provided
    let sleepDurationMinutes = dto.sleepDurationMinutes;
    if (sleepDurationMinutes === undefined && dto.sleepHours !== undefined) {
      sleepDurationMinutes = Math.round(dto.sleepHours * 60);
    }

    const recordedAt = dto.recordedAt ? new Date(dto.recordedAt) : new Date();

    const checkIn = await this.wellnessRepo.createCheckIn({
      patientId: patient.id,
      mood: dto.mood,
      stress: dto.stress,
      energy: dto.energy,
      sleepQuality: dto.sleepQuality,
      sleepDurationMinutes: sleepDurationMinutes ?? null,
      note: dto.note ?? null,
      recordedAt,
    });

    this.auditService.logEvent({
      event: 'WELLNESS_CHECK_IN_CREATED',
      actorId: userId,
      role: 'PATIENT',
      resource: `WELLNESS_CHECK_IN:${checkIn.id}`,
      action: 'RECORD_WELLNESS_CHECK_IN',
      metadata: {
        patientId: patient.id,
        checkInId: checkIn.id,
      },
    });

    return this.mapToCheckInDto(checkIn);
  }

  /**
   * Retrieves paginated check-ins for the authenticated patient.
   */
  public async getPatientCheckIns(
    userId: string,
    query: WellnessQueryDto,
  ): Promise<PaginatedWellnessCheckInsResponseDto> {
    const patient = await this.careRelService.getOrCreatePatientProfile(userId);
    const { startDate, endDate } = this.resolveDateRange(query);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const result = await this.wellnessRepo.findCheckIns({
      patientId: patient.id,
      startDate,
      endDate,
      page,
      limit,
    });

    return {
      data: result.data.map((c) => this.mapToCheckInDto(c)),
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit) || 1,
    };
  }

  /**
   * Retrieves a single check-in by ID, strictly enforcing patient ownership.
   */
  public async getPatientCheckInById(
    userId: string,
    checkInId: string,
  ): Promise<WellnessCheckInResponseDto> {
    const patient = await this.careRelService.getOrCreatePatientProfile(userId);
    const checkIn = await this.wellnessRepo.findPatientCheckInById(patient.id, checkInId);

    if (!checkIn) {
      throw new NotFoundError('Wellness check-in not found');
    }

    return this.mapToCheckInDto(checkIn);
  }

  /**
   * Updates an existing check-in, strictly enforcing patient ownership.
   */
  public async updatePatientCheckIn(
    userId: string,
    checkInId: string,
    dto: UpdateWellnessCheckInDto,
  ): Promise<WellnessCheckInResponseDto> {
    const patient = await this.careRelService.getOrCreatePatientProfile(userId);
    const existing = await this.wellnessRepo.findPatientCheckInById(patient.id, checkInId);

    if (!existing) {
      throw new NotFoundError('Wellness check-in not found');
    }

    let sleepDurationMinutes = dto.sleepDurationMinutes;
    if (sleepDurationMinutes === undefined && dto.sleepHours !== undefined) {
      sleepDurationMinutes = Math.round(dto.sleepHours * 60);
    }

    const updated = await this.wellnessRepo.updateCheckIn(checkInId, {
      mood: dto.mood,
      stress: dto.stress,
      energy: dto.energy,
      sleepQuality: dto.sleepQuality,
      sleepDurationMinutes,
      note: dto.note,
      recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : undefined,
    });

    this.auditService.logEvent({
      event: 'WELLNESS_CHECK_IN_UPDATED',
      actorId: userId,
      role: 'PATIENT',
      resource: `WELLNESS_CHECK_IN:${checkInId}`,
      action: 'UPDATE_WELLNESS_CHECK_IN',
      metadata: {
        patientId: patient.id,
        checkInId,
      },
    });

    return this.mapToCheckInDto(updated);
  }

  /**
   * Deletes a check-in, strictly enforcing patient ownership.
   */
  public async deletePatientCheckIn(userId: string, checkInId: string): Promise<void> {
    const patient = await this.careRelService.getOrCreatePatientProfile(userId);
    const existing = await this.wellnessRepo.findPatientCheckInById(patient.id, checkInId);

    if (!existing) {
      throw new NotFoundError('Wellness check-in not found');
    }

    await this.wellnessRepo.deleteCheckIn(checkInId);

    this.auditService.logEvent({
      event: 'WELLNESS_CHECK_IN_DELETED',
      actorId: userId,
      role: 'PATIENT',
      resource: `WELLNESS_CHECK_IN:${checkInId}`,
      action: 'DELETE_WELLNESS_CHECK_IN',
      metadata: {
        patientId: patient.id,
        checkInId,
      },
    });
  }

  /**
   * Retrieves high-level wellness summary (latest, today, streak, total count).
   */
  public async getPatientSummary(
    userId: string,
    timezone = 'UTC',
  ): Promise<WellnessSummaryResponseDto> {
    const patient = await this.careRelService.getOrCreatePatientProfile(userId);

    const [latest, totalCheckIns, allCheckIns] = await Promise.all([
      this.wellnessRepo.findLatestCheckIn(patient.id),
      this.wellnessRepo.countCheckIns(patient.id),
      this.wellnessRepo.findCheckInsBetween(
        patient.id,
        new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // last 60 days for streak calculation
        new Date(),
      ),
    ]);

    const todayDateStr = this.getLocalDateString(new Date(), timezone);
    const todayCheckIn =
      allCheckIns.find((c) => this.getLocalDateString(c.recordedAt, timezone) === todayDateStr) ??
      null;

    const streakDays = this.calculateStreak(allCheckIns, timezone);

    return {
      latestCheckIn: latest ? this.mapToCheckInDto(latest) : null,
      todayCheckIn: todayCheckIn ? this.mapToCheckInDto(todayCheckIn) : null,
      streakDays,
      totalCheckIns,
    };
  }

  /**
   * Computes descriptive non-diagnostic trends and period-over-period comparisons.
   */
  public async getPatientTrends(
    userId: string,
    query: WellnessTrendsQueryDto,
  ): Promise<WellnessTrendsResponseDto> {
    const patient = await this.careRelService.getOrCreatePatientProfile(userId);
    return this.calculateTrendsForPatient(patient.id, query, userId, 'PATIENT');
  }

  /**
   * Doctor-authorized check-in list query.
   * Access control and active consent scope (WELLNESS) are verified prior by guards.
   */
  public async getPatientCheckInsForDoctor(
    doctorId: string,
    targetPatientId: string,
    query: WellnessQueryDto,
  ): Promise<PaginatedWellnessCheckInsResponseDto> {
    const patient = await this.resolvePatient(targetPatientId);
    const { startDate, endDate } = this.resolveDateRange(query);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const result = await this.wellnessRepo.findCheckIns({
      patientId: patient.id,
      startDate,
      endDate,
      page,
      limit,
    });

    this.auditService.logEvent({
      event: 'DOCTOR_ACCESSED_PATIENT_WELLNESS',
      actorId: doctorId,
      role: 'DOCTOR',
      resource: `PATIENT_WELLNESS:${patient.id}`,
      action: 'VIEW_PATIENT_CHECK_INS',
      metadata: {
        patientId: patient.id,
        queryPeriod: query.period,
      },
    });

    return {
      data: result.data.map((c) => this.mapToCheckInDto(c)),
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit) || 1,
    };
  }

  /**
   * Doctor-authorized trends query.
   * Access control and active consent scope (WELLNESS) are verified prior by guards.
   */
  public async getPatientTrendsForDoctor(
    doctorId: string,
    targetPatientId: string,
    query: WellnessTrendsQueryDto,
  ): Promise<WellnessTrendsResponseDto> {
    const patient = await this.resolvePatient(targetPatientId);

    const trends = await this.calculateTrendsForPatient(patient.id, query, doctorId, 'DOCTOR');

    this.auditService.logEvent({
      event: 'DOCTOR_ACCESSED_PATIENT_WELLNESS',
      actorId: doctorId,
      role: 'DOCTOR',
      resource: `PATIENT_WELLNESS:${patient.id}`,
      action: 'VIEW_PATIENT_TRENDS',
      metadata: {
        patientId: patient.id,
        period: query.period,
      },
    });

    return trends;
  }

  // ---------------------------------------------------------------------------
  // Internal Analytics & Descriptive Trends Engine (Strictly Non-Diagnostic)
  // ---------------------------------------------------------------------------

  private async calculateTrendsForPatient(
    patientId: string,
    query: WellnessTrendsQueryDto,
    actorId: string,
    role: string,
  ): Promise<WellnessTrendsResponseDto> {
    const period = query.period ?? '7d';
    const timezone = query.timezone ?? 'UTC';

    const { currentStart, currentEnd, previousStart, previousEnd } = this.computePeriodWindows(
      period,
      query.startDate,
      query.endDate,
    );

    const [currentCheckIns, previousCheckIns] = await Promise.all([
      this.wellnessRepo.findCheckInsBetween(patientId, currentStart, currentEnd),
      previousStart && previousEnd
        ? this.wellnessRepo.findCheckInsBetween(patientId, previousStart, previousEnd)
        : Promise.resolve([]),
    ]);

    const totalCheckIns = currentCheckIns.length;
    const hasSufficientData = totalCheckIns >= 3;

    // Averages
    const averageMood = this.computeAverage(currentCheckIns.map((c) => c.mood));
    const averageStress = this.computeAverage(currentCheckIns.map((c) => c.stress));
    const averageEnergy = this.computeAverage(currentCheckIns.map((c) => c.energy));
    const averageSleepQuality = this.computeAverage(currentCheckIns.map((c) => c.sleepQuality));

    const sleepDurations = currentCheckIns
      .map((c) => c.sleepDurationMinutes)
      .filter((d): d is number => d !== null && d !== undefined);
    const averageSleepDurationMinutes = this.computeAverage(sleepDurations);

    // Baseline previous period comparison (only if sufficient data exists)
    let previousPeriodComparison = null;
    if (hasSufficientData && previousCheckIns.length > 0) {
      const prevMood = this.computeAverage(previousCheckIns.map((c) => c.mood));
      const prevStress = this.computeAverage(previousCheckIns.map((c) => c.stress));
      const prevEnergy = this.computeAverage(previousCheckIns.map((c) => c.energy));
      const prevSleepQuality = this.computeAverage(previousCheckIns.map((c) => c.sleepQuality));
      const prevSleepDurations = previousCheckIns
        .map((c) => c.sleepDurationMinutes)
        .filter((d): d is number => d !== null && d !== undefined);
      const prevSleepDuration = this.computeAverage(prevSleepDurations);

      previousPeriodComparison = {
        previousTotalCheckIns: previousCheckIns.length,
        moodDelta: this.roundDelta(averageMood, prevMood),
        stressDelta: this.roundDelta(averageStress, prevStress),
        energyDelta: this.roundDelta(averageEnergy, prevEnergy),
        sleepQualityDelta: this.roundDelta(averageSleepQuality, prevSleepQuality),
        sleepDurationMinutesDelta: this.roundDelta(averageSleepDurationMinutes, prevSleepDuration),
      };
    }

    // Descriptive insights (strictly neutral, non-diagnostic, non-prescriptive)
    const descriptiveInsights = this.generateDescriptiveInsights({
      totalCheckIns,
      hasSufficientData,
      averageMood,
      averageStress,
      averageEnergy,
      averageSleepQuality,
      previousComparison: previousPeriodComparison,
    });

    this.auditService.logEvent({
      event: 'WELLNESS_TRENDS_VIEWED',
      actorId,
      role,
      resource: `PATIENT_WELLNESS:${patientId}`,
      action: 'CALCULATE_WELLNESS_TRENDS',
      metadata: {
        patientId,
        period,
        timezone,
        hasSufficientData,
        totalCheckIns,
      },
    });

    return {
      period,
      startDate: currentStart.toISOString(),
      endDate: currentEnd.toISOString(),
      totalCheckIns,
      hasSufficientData,
      averageMood,
      averageStress,
      averageEnergy,
      averageSleepQuality,
      averageSleepDurationMinutes,
      previousPeriodComparison,
      descriptiveInsights,
    };
  }

  private generateDescriptiveInsights(params: {
    totalCheckIns: number;
    hasSufficientData: boolean;
    averageMood: number | null;
    averageStress: number | null;
    averageEnergy: number | null;
    averageSleepQuality: number | null;
    previousComparison: {
      moodDelta: number | null;
      stressDelta: number | null;
      energyDelta: number | null;
      sleepQualityDelta: number | null;
      [key: string]: unknown;
    } | null;
  }): string[] {
    const { totalCheckIns, hasSufficientData, previousComparison } = params;
    const insights: string[] = [];

    if (totalCheckIns === 0) {
      insights.push('No wellness check-ins recorded in the selected period.');
      return insights;
    }

    if (!hasSufficientData) {
      insights.push(
        'At least 3 check-ins are recommended to establish meaningful trend comparisons. Descriptive averages only are shown.',
      );
      return insights;
    }

    if (!previousComparison) {
      insights.push(
        'Sufficient check-ins recorded for this period. A baseline from a prior period will enable trend comparison.',
      );
      return insights;
    }

    // Mood insight
    if (previousComparison.moodDelta !== null) {
      if (previousComparison.moodDelta >= 0.3) {
        insights.push(
          `Your recorded mood average increased by ${previousComparison.moodDelta.toFixed(1)} compared with the previous period.`,
        );
      } else if (previousComparison.moodDelta <= -0.3) {
        insights.push(
          `Your recorded mood average decreased by ${Math.abs(previousComparison.moodDelta).toFixed(1)} compared with the previous period.`,
        );
      } else {
        insights.push(
          'Your recorded mood average remained stable compared with the previous period.',
        );
      }
    }

    // Stress insight
    if (previousComparison.stressDelta !== null) {
      if (previousComparison.stressDelta >= 0.3) {
        insights.push(
          'Your recorded stress level was higher on average compared with the previous period.',
        );
      } else if (previousComparison.stressDelta <= -0.3) {
        insights.push(
          'Your recorded stress level was lower on average compared with the previous period.',
        );
      } else {
        insights.push('Your recorded stress level remained consistent across periods.');
      }
    }

    // Energy insight
    if (previousComparison.energyDelta !== null) {
      if (previousComparison.energyDelta >= 0.3) {
        insights.push('You reported higher energy on average during recent check-ins.');
      } else if (previousComparison.energyDelta <= -0.3) {
        insights.push('You reported lower energy on average during recent check-ins.');
      }
    }

    // Sleep quality insight
    if (previousComparison.sleepQualityDelta !== null) {
      if (previousComparison.sleepQualityDelta >= 0.3) {
        insights.push(
          'Your sleep entries reflect higher quality scores compared with the previous period.',
        );
      } else if (previousComparison.sleepQualityDelta <= -0.3) {
        insights.push(
          'Your sleep entries reflect lower quality scores compared with the previous period.',
        );
      }
    }

    return insights;
  }

  // ---------------------------------------------------------------------------
  // Date & Period Helpers
  // ---------------------------------------------------------------------------

  private resolveDateRange(query: WellnessQueryDto): {
    startDate?: Date | undefined;
    endDate?: Date | undefined;
  } {
    if (query.startDate || query.endDate) {
      const startDate = query.startDate ? new Date(query.startDate) : undefined;
      const endDate = query.endDate ? new Date(query.endDate) : undefined;
      if (startDate && endDate && startDate > endDate) {
        throw new ValidationError('startDate cannot be after endDate');
      }
      return { startDate, endDate };
    }

    const now = new Date();
    switch (query.period) {
      case 'today': {
        const start = new Date(now);
        start.setUTCHours(0, 0, 0, 0);
        return { startDate: start, endDate: now };
      }
      case '7d': {
        const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { startDate: start, endDate: now };
      }
      case '90d': {
        const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        return { startDate: start, endDate: now };
      }
      case '30d':
      default: {
        const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return { startDate: start, endDate: now };
      }
    }
  }

  private computePeriodWindows(
    period: string,
    customStartStr?: string,
    customEndStr?: string,
  ): {
    currentStart: Date;
    currentEnd: Date;
    previousStart: Date | null;
    previousEnd: Date | null;
  } {
    const now = new Date();

    if (period === 'custom' && customStartStr && customEndStr) {
      const currentStart = new Date(customStartStr);
      const currentEnd = new Date(customEndStr);
      if (currentStart > currentEnd) {
        throw new ValidationError('startDate cannot be after endDate');
      }
      const durationMs = currentEnd.getTime() - currentStart.getTime();
      const previousEnd = new Date(currentStart.getTime() - 1);
      const previousStart = new Date(previousEnd.getTime() - durationMs);
      return { currentStart, currentEnd, previousStart, previousEnd };
    }

    let days = 7;
    if (period === '30d') days = 30;
    if (period === '90d') days = 90;

    const currentEnd = now;
    const currentStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const previousEnd = new Date(currentStart.getTime() - 1);
    const previousStart = new Date(previousEnd.getTime() - days * 24 * 60 * 60 * 1000);

    return { currentStart, currentEnd, previousStart, previousEnd };
  }

  private calculateStreak(checkIns: WellnessCheckInEntity[], timezone: string): number {
    if (checkIns.length === 0) return 0;

    const dateSet = new Set<string>();
    for (const c of checkIns) {
      dateSet.add(this.getLocalDateString(c.recordedAt, timezone));
    }

    let streak = 0;
    const currentCursor = new Date();

    // If today is not logged, check if yesterday was logged to preserve ongoing streak
    let cursorDateStr = this.getLocalDateString(currentCursor, timezone);
    if (!dateSet.has(cursorDateStr)) {
      currentCursor.setDate(currentCursor.getDate() - 1);
      cursorDateStr = this.getLocalDateString(currentCursor, timezone);
      if (!dateSet.has(cursorDateStr)) {
        return 0;
      }
    }

    while (dateSet.has(cursorDateStr)) {
      streak++;
      currentCursor.setDate(currentCursor.getDate() - 1);
      cursorDateStr = this.getLocalDateString(currentCursor, timezone);
    }

    return streak;
  }

  private getLocalDateString(date: Date, timezone: string): string {
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(date); // YYYY-MM-DD
    } catch {
      return date.toISOString().slice(0, 10);
    }
  }

  private computeAverage(values: number[]): number | null {
    if (values.length === 0) return null;
    const sum = values.reduce((acc, v) => acc + v, 0);
    return Math.round((sum / values.length) * 10) / 10;
  }

  private roundDelta(curr: number | null, prev: number | null): number | null {
    if (curr === null || prev === null) return null;
    return Math.round((curr - prev) * 10) / 10;
  }

  private async resolvePatient(patientId: string) {
    const patient = patientId.startsWith('PAT-')
      ? await this.careRelRepo.findPatientByPublicId(patientId)
      : await this.careRelRepo.findPatientById(patientId);

    if (!patient) {
      throw new NotFoundError('Patient resource not found');
    }
    return patient;
  }

  private mapToCheckInDto(entity: WellnessCheckInEntity): WellnessCheckInResponseDto {
    return {
      id: entity.id,
      patientId: entity.patientId,
      mood: entity.mood,
      stress: entity.stress,
      energy: entity.energy,
      sleepQuality: entity.sleepQuality,
      sleepDurationMinutes: entity.sleepDurationMinutes ?? null,
      note: entity.note ?? null,
      recordedAt: entity.recordedAt.toISOString(),
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}

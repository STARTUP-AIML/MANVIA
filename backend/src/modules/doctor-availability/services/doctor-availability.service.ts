import { Inject, Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../common/errors/app-error.js';
import {
  DOCTOR_AVAILABILITY_REPOSITORY,
  type IDoctorAvailabilityRepository,
} from '../interfaces/availability-repository.interface.js';
import {
  DOCTORS_REPOSITORY,
  type IDoctorsRepository,
} from '../../doctors/interfaces/doctor-repository.interface.js';
import { VerificationStatus } from '../../doctors/enums/verification-status.enum.js';
import { AvailabilityValidationService } from './availability-validation.service.js';
import type { CreateAvailabilityDto } from '../dto/create-availability.dto.js';
import type { UpdateAvailabilityDto } from '../dto/update-availability.dto.js';
import type { DoctorAvailabilityResponseDto } from '../dto/doctor-availability-response.dto.js';
import type { PatientDoctorAvailabilityResponseDto } from '../dto/patient-doctor-discovery.dto.js';
import type { DoctorAvailabilityEntity } from '../entities/doctor-availability.entity.js';

@Injectable()
export class DoctorAvailabilityService {
  constructor(
    @Inject(DOCTOR_AVAILABILITY_REPOSITORY)
    private readonly availabilityRepo: IDoctorAvailabilityRepository,
    @Inject(DOCTORS_REPOSITORY)
    private readonly doctorsRepo: IDoctorsRepository,
    private readonly validationService: AvailabilityValidationService,
  ) {}

  public async getSelfAvailabilities(userId: string): Promise<DoctorAvailabilityResponseDto[]> {
    const doctor = await this.doctorsRepo.findByUserId(userId);
    if (!doctor) {
      throw new NotFoundError('Doctor profile not found for authenticated user');
    }

    const availabilities = await this.availabilityRepo.findAvailabilitiesByDoctorId(
      doctor.id,
      false,
    );
    return availabilities.map((a) => this.mapToResponseDto(a));
  }

  public async createAvailability(
    userId: string,
    dto: CreateAvailabilityDto,
  ): Promise<DoctorAvailabilityResponseDto> {
    const doctor = await this.doctorsRepo.findByUserId(userId);
    if (!doctor) {
      throw new NotFoundError('Doctor profile not found for authenticated user');
    }

    if (doctor.verificationStatus === VerificationStatus.SUSPENDED) {
      throw new ForbiddenError('Suspended physicians cannot modify availability schedules');
    }

    // 1. Timezone validity check
    this.validationService.validateTimezone(dto.timezone);

    // 2. Time range & cross-midnight policy check
    this.validationService.validateTimeRange(dto.startTime, dto.endTime);

    // 3. Date boundaries check
    const effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : null;
    const effectiveUntil = dto.effectiveUntil ? new Date(dto.effectiveUntil) : null;
    this.validationService.validateEffectiveDateRange(effectiveFrom, effectiveUntil);

    // 4. Overlap check with existing active windows on the same weekday
    const existing = await this.availabilityRepo.findAvailabilitiesByDoctorId(doctor.id, true);
    this.validationService.checkOverlappingWindows(existing, {
      dayOfWeek: dto.dayOfWeek,
      startTime: dto.startTime,
      endTime: dto.endTime,
    });

    const created = await this.availabilityRepo.createAvailability(doctor.id, {
      timezone: dto.timezone.trim(),
      dayOfWeek: dto.dayOfWeek,
      startTime: dto.startTime,
      endTime: dto.endTime,
      effectiveFrom,
      effectiveUntil,
      isActive: dto.isActive ?? true,
    });

    return this.mapToResponseDto(created);
  }

  public async updateAvailability(
    userId: string,
    availabilityId: string,
    dto: UpdateAvailabilityDto,
  ): Promise<DoctorAvailabilityResponseDto> {
    const doctor = await this.doctorsRepo.findByUserId(userId);
    if (!doctor) {
      throw new NotFoundError('Doctor profile not found for authenticated user');
    }

    if (doctor.verificationStatus === VerificationStatus.SUSPENDED) {
      throw new ForbiddenError('Suspended physicians cannot modify availability schedules');
    }

    const existing = await this.availabilityRepo.findAvailabilityById(availabilityId);
    if (!existing) {
      throw new NotFoundError(`Availability rule with ID '${availabilityId}' not found`);
    }

    // Ownership check: physician can only modify their own availability
    if (existing.doctorId !== doctor.id) {
      throw new ForbiddenError('Access denied: you can only modify your own availability rules');
    }

    const timezone = dto.timezone !== undefined ? dto.timezone.trim() : existing.timezone;
    if (dto.timezone !== undefined) {
      this.validationService.validateTimezone(timezone);
    }

    const startTime = dto.startTime !== undefined ? dto.startTime : existing.startTime;
    const endTime = dto.endTime !== undefined ? dto.endTime : existing.endTime;
    const dayOfWeek = dto.dayOfWeek !== undefined ? dto.dayOfWeek : existing.dayOfWeek;

    if (dto.startTime !== undefined || dto.endTime !== undefined) {
      this.validationService.validateTimeRange(startTime, endTime);
    }

    const effectiveFrom =
      dto.effectiveFrom !== undefined
        ? dto.effectiveFrom
          ? new Date(dto.effectiveFrom)
          : null
        : existing.effectiveFrom;
    const effectiveUntil =
      dto.effectiveUntil !== undefined
        ? dto.effectiveUntil
          ? new Date(dto.effectiveUntil)
          : null
        : existing.effectiveUntil;
    this.validationService.validateEffectiveDateRange(effectiveFrom, effectiveUntil);

    // Overlap validation if active
    const willBeActive = dto.isActive !== undefined ? dto.isActive : existing.isActive;
    if (willBeActive) {
      const allDoctorWindows = await this.availabilityRepo.findAvailabilitiesByDoctorId(
        doctor.id,
        true,
      );
      this.validationService.checkOverlappingWindows(allDoctorWindows, {
        dayOfWeek,
        startTime,
        endTime,
        excludeId: availabilityId,
      });
    }

    const updated = await this.availabilityRepo.updateAvailability(availabilityId, {
      timezone,
      dayOfWeek,
      startTime,
      endTime,
      effectiveFrom,
      effectiveUntil,
      isActive: dto.isActive,
    });

    return this.mapToResponseDto(updated);
  }

  public async deleteAvailability(
    userId: string,
    availabilityId: string,
  ): Promise<{ success: boolean; id: string }> {
    const doctor = await this.doctorsRepo.findByUserId(userId);
    if (!doctor) {
      throw new NotFoundError('Doctor profile not found for authenticated user');
    }

    if (doctor.verificationStatus === VerificationStatus.SUSPENDED) {
      throw new ForbiddenError('Suspended physicians cannot modify availability schedules');
    }

    const existing = await this.availabilityRepo.findAvailabilityById(availabilityId);
    if (!existing) {
      throw new NotFoundError(`Availability rule with ID '${availabilityId}' not found`);
    }

    if (existing.doctorId !== doctor.id) {
      throw new ForbiddenError('Access denied: you can only delete your own availability rules');
    }

    await this.availabilityRepo.deleteAvailability(availabilityId);
    return { success: true, id: availabilityId };
  }

  // --------------------------------------------------------------------------
  // Patient Discovery API
  // --------------------------------------------------------------------------

  public async getDoctorPublicAvailabilities(
    publicDoctorId: string,
  ): Promise<PatientDoctorAvailabilityResponseDto[]> {
    const doctor = await this.doctorsRepo.findByPublicId(publicDoctorId);
    if (!doctor) {
      throw new NotFoundError(`Doctor with public ID '${publicDoctorId}' not found`);
    }

    // Authoritative verification rule: unverified/rejected doctors cannot appear as active providers
    if (doctor.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new NotFoundError(`Doctor is not currently an active verified consultation provider`);
    }

    const activeAvailabilities = await this.availabilityRepo.findAvailabilitiesByDoctorId(
      doctor.id,
      true,
    );

    return activeAvailabilities.map((a) => ({
      id: a.id,
      timezone: a.timezone,
      dayOfWeek: a.dayOfWeek,
      startTime: a.startTime,
      endTime: a.endTime,
    }));
  }

  private mapToResponseDto(a: DoctorAvailabilityEntity): DoctorAvailabilityResponseDto {
    return {
      id: a.id,
      timezone: a.timezone,
      dayOfWeek: a.dayOfWeek,
      startTime: a.startTime,
      endTime: a.endTime,
      effectiveFrom: a.effectiveFrom ? a.effectiveFrom.toISOString().slice(0, 10) : null,
      effectiveUntil: a.effectiveUntil ? a.effectiveUntil.toISOString().slice(0, 10) : null,
      isActive: a.isActive,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    };
  }
}

import { Inject, Injectable } from '@nestjs/common';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../common/errors/app-error.js';
import {
  DOCTOR_AVAILABILITY_REPOSITORY,
  type IDoctorAvailabilityRepository,
} from '../interfaces/availability-repository.interface.js';
import {
  DOCTORS_REPOSITORY,
  type IDoctorsRepository,
} from '../../doctors/interfaces/doctor-repository.interface.js';
import { VerificationStatus } from '../../doctors/enums/verification-status.enum.js';
import { OfferStatus } from '../enums/offer-status.enum.js';
import type { CreateConsultationOfferDto } from '../dto/create-consultation-offer.dto.js';
import type { UpdateConsultationOfferDto } from '../dto/update-consultation-offer.dto.js';
import type { ConsultationOfferResponseDto } from '../dto/consultation-offer-response.dto.js';
import type { PatientDoctorOfferResponseDto } from '../dto/patient-doctor-discovery.dto.js';
import type { ConsultationOfferEntity } from '../entities/consultation-offer.entity.js';

@Injectable()
export class ConsultationOffersService {
  constructor(
    @Inject(DOCTOR_AVAILABILITY_REPOSITORY)
    private readonly availabilityRepo: IDoctorAvailabilityRepository,
    @Inject(DOCTORS_REPOSITORY)
    private readonly doctorsRepo: IDoctorsRepository,
  ) {}

  public async getSelfOffers(userId: string): Promise<ConsultationOfferResponseDto[]> {
    const doctor = await this.doctorsRepo.findByUserId(userId);
    if (!doctor) {
      throw new NotFoundError('Doctor profile not found for authenticated user');
    }

    const offers = await this.availabilityRepo.findOffersByDoctorId(doctor.id, false);
    return offers.map((o) => this.mapToResponseDto(o));
  }

  public async createOffer(
    userId: string,
    dto: CreateConsultationOfferDto,
  ): Promise<ConsultationOfferResponseDto> {
    const doctor = await this.doctorsRepo.findByUserId(userId);
    if (!doctor) {
      throw new NotFoundError('Doctor profile not found for authenticated user');
    }

    if (doctor.verificationStatus === VerificationStatus.SUSPENDED) {
      throw new ForbiddenError('Suspended physicians cannot modify consultation offers');
    }

    if (dto.durationMinutes <= 0) {
      throw new ValidationError('Consultation duration must be greater than 0 minutes');
    }

    if (dto.fee < 0) {
      throw new ValidationError('Consultation fee cannot be negative');
    }

    const currency = (dto.currency ?? 'USD').toUpperCase();
    if (currency.length !== 3) {
      throw new ValidationError('Currency must be a valid 3-letter ISO code');
    }

    // Duplicate check among active offers for this doctor
    const existingOffers = await this.availabilityRepo.findOffersByDoctorId(doctor.id, true);
    for (const off of existingOffers) {
      if (
        off.consultationType === dto.consultationType &&
        off.durationMinutes === dto.durationMinutes &&
        off.title.trim().toLowerCase() === dto.title.trim().toLowerCase()
      ) {
        throw new ConflictError(
          `An active consultation offer with title '${dto.title}', type '${dto.consultationType}', and duration ${dto.durationMinutes}m already exists`,
        );
      }
    }

    const created = await this.availabilityRepo.createOffer(doctor.id, {
      title: dto.title.trim(),
      description: dto.description?.trim(),
      consultationType: dto.consultationType,
      durationMinutes: dto.durationMinutes,
      fee: dto.fee,
      currency,
      status: dto.status ?? OfferStatus.ACTIVE,
    });

    return this.mapToResponseDto(created);
  }

  public async updateOffer(
    userId: string,
    offerId: string,
    dto: UpdateConsultationOfferDto,
  ): Promise<ConsultationOfferResponseDto> {
    const doctor = await this.doctorsRepo.findByUserId(userId);
    if (!doctor) {
      throw new NotFoundError('Doctor profile not found for authenticated user');
    }

    if (doctor.verificationStatus === VerificationStatus.SUSPENDED) {
      throw new ForbiddenError('Suspended physicians cannot modify consultation offers');
    }

    const existing = await this.availabilityRepo.findOfferById(offerId);
    if (!existing) {
      throw new NotFoundError(`Consultation offer with ID '${offerId}' not found`);
    }

    // Ownership check
    if (existing.doctorId !== doctor.id) {
      throw new ForbiddenError('Access denied: you can only modify your own consultation offers');
    }

    if (dto.durationMinutes !== undefined && dto.durationMinutes <= 0) {
      throw new ValidationError('Consultation duration must be greater than 0 minutes');
    }

    if (dto.fee !== undefined && dto.fee < 0) {
      throw new ValidationError('Consultation fee cannot be negative');
    }

    const currency = dto.currency !== undefined ? dto.currency.toUpperCase() : undefined;
    if (currency !== undefined && currency.length !== 3) {
      throw new ValidationError('Currency must be a valid 3-letter ISO code');
    }

    const updated = await this.availabilityRepo.updateOffer(offerId, {
      title: dto.title?.trim(),
      description: dto.description?.trim(),
      consultationType: dto.consultationType,
      durationMinutes: dto.durationMinutes,
      fee: dto.fee,
      currency,
      status: dto.status,
    });

    return this.mapToResponseDto(updated);
  }

  public async deleteOffer(
    userId: string,
    offerId: string,
  ): Promise<{ success: boolean; id: string }> {
    const doctor = await this.doctorsRepo.findByUserId(userId);
    if (!doctor) {
      throw new NotFoundError('Doctor profile not found for authenticated user');
    }

    if (doctor.verificationStatus === VerificationStatus.SUSPENDED) {
      throw new ForbiddenError('Suspended physicians cannot modify consultation offers');
    }

    const existing = await this.availabilityRepo.findOfferById(offerId);
    if (!existing) {
      throw new NotFoundError(`Consultation offer with ID '${offerId}' not found`);
    }

    if (existing.doctorId !== doctor.id) {
      throw new ForbiddenError('Access denied: you can only delete your own consultation offers');
    }

    await this.availabilityRepo.deleteOffer(offerId);
    return { success: true, id: offerId };
  }

  // --------------------------------------------------------------------------
  // Patient Discovery API
  // --------------------------------------------------------------------------

  public async getDoctorPublicOffers(
    publicDoctorId: string,
  ): Promise<PatientDoctorOfferResponseDto[]> {
    const doctor = await this.doctorsRepo.findByPublicId(publicDoctorId);
    if (!doctor) {
      throw new NotFoundError(`Doctor with public ID '${publicDoctorId}' not found`);
    }

    // Authoritative verification rule: unverified/rejected doctors cannot appear as active providers
    if (doctor.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new NotFoundError(`Doctor is not currently an active verified consultation provider`);
    }

    const activeOffers = await this.availabilityRepo.findOffersByDoctorId(doctor.id, true);

    return activeOffers.map((o) => ({
      id: o.id,
      title: o.title,
      description: o.description,
      consultationType: o.consultationType,
      durationMinutes: o.durationMinutes,
      fee: o.fee,
      currency: o.currency,
    }));
  }

  private mapToResponseDto(o: ConsultationOfferEntity): ConsultationOfferResponseDto {
    return {
      id: o.id,
      title: o.title,
      description: o.description,
      consultationType: o.consultationType,
      durationMinutes: o.durationMinutes,
      fee: o.fee,
      currency: o.currency,
      status: o.status,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    };
  }
}

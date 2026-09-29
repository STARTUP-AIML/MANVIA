// ==============================================================================
// MANVIA — Patient Domain Service
// ==============================================================================
// Phase 6: Patient Profile Business Logic & Lifecycle Management
// ==============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { PatientProfileRepository } from '../repositories/patient-profile.repository.js';
import { AuthAuditService } from '../../auth/services/auth-audit.service.js';
import { UserService } from '../../identity/user.service.js';
import type {
  CreatePatientProfileData,
  UpdatePatientProfileData,
  PatientProfile,
} from '../patient.interface.js';
import type { CreatePatientProfileDto } from '../dto/create-patient-profile.dto.js';
import type { UpdatePatientProfileDto } from '../dto/update-patient-profile.dto.js';
import { NotFoundError, ConflictError } from '../../../common/errors/app-error.js';

@Injectable()
export class PatientService {
  private readonly logger = new Logger(PatientService.name);

  constructor(
    private readonly patientProfileRepository: PatientProfileRepository,
    private readonly userService: UserService,
    private readonly auditService: AuthAuditService,
  ) {}

  /**
   * Creates a new PatientProfile for an existing User.
   * Ensures 1-to-1 relationship integrity and emits a security audit event.
   */
  public async createProfile(
    userId: string,
    dto?: CreatePatientProfileDto,
  ): Promise<PatientProfile> {
    // 1. Verify that user identity exists and is active
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundError('User identity not found');
    }

    // 2. Prevent duplicate profile creation for the same user
    const existing = await this.patientProfileRepository.findByUserId(userId);
    if (existing) {
      throw new ConflictError('Patient profile already exists for this user');
    }

    const createData: CreatePatientProfileData = {
      userId,
      legalFirstName: dto?.legalFirstName,
      legalLastName: dto?.legalLastName,
      dateOfBirth: dto?.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      biologicalSex: dto?.biologicalSex,
      bloodGroup: dto?.bloodGroup,
      emergencyContactName: dto?.emergencyContact?.name,
      emergencyContactPhone: dto?.emergencyContact?.phone,
      emergencyContactRelationship: dto?.emergencyContact?.relationship,
      preferredLanguage: dto?.preferredLanguage,
      timezone: dto?.timezone,
    };

    const profile = await this.patientProfileRepository.create(createData);

    // 3. Security Audit Logging
    await this.auditService.logEvent({
      actorUserId: userId,
      action: 'PATIENT.PROFILE_CREATED',
      resourceType: 'PATIENT_PROFILE',
      resourceId: profile.id,
      status: 'SUCCESS',
      details: {
        publicPatientId: profile.publicPatientId,
      },
    });

    this.logger.log(`PatientProfile created for user ${userId} [${profile.publicPatientId}]`);
    return profile;
  }

  /**
   * Retrieves the PatientProfile associated with a central user ID.
   */
  public async getProfileByUserId(userId: string): Promise<PatientProfile> {
    const profile = await this.patientProfileRepository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundError('Patient profile not found');
    }
    return profile;
  }

  /**
   * Retrieves a PatientProfile by its safe public identifier (PAT-XXXXXXXX).
   */
  public async getProfileByPublicId(publicPatientId: string): Promise<PatientProfile> {
    const profile = await this.patientProfileRepository.findByPublicId(publicPatientId);
    if (!profile) {
      throw new NotFoundError('Patient profile not found');
    }
    return profile;
  }

  /**
   * Updates demographic and preference details on a patient profile.
   * Mass assignment protected: only allowed fields are updated.
   */
  public async updateProfile(
    userId: string,
    dto: UpdatePatientProfileDto,
  ): Promise<PatientProfile> {
    // 1. Ensure profile exists
    const existing = await this.patientProfileRepository.findByUserId(userId);
    if (!existing) {
      throw new NotFoundError('Patient profile not found');
    }

    // 2. Map only permitted fields
    const updateData: UpdatePatientProfileData = {
      legalFirstName: dto.legalFirstName,
      legalLastName: dto.legalLastName,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      biologicalSex: dto.biologicalSex,
      bloodGroup: dto.bloodGroup,
      emergencyContactName: dto.emergencyContact?.name,
      emergencyContactPhone: dto.emergencyContact?.phone,
      emergencyContactRelationship: dto.emergencyContact?.relationship,
      preferredLanguage: dto.preferredLanguage,
      timezone: dto.timezone,
    };

    const updated = await this.patientProfileRepository.updateByUserId(userId, updateData);

    // 3. Security Audit Logging
    await this.auditService.logEvent({
      actorUserId: userId,
      action: 'PATIENT.PROFILE_UPDATED',
      resourceType: 'PATIENT_PROFILE',
      resourceId: updated.id,
      status: 'SUCCESS',
      details: {
        publicPatientId: updated.publicPatientId,
      },
    });

    return updated;
  }
}

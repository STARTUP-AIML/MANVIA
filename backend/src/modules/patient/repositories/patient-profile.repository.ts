// ==============================================================================
// MANVIA — Patient Profile Repository
// ==============================================================================
// Phase 6: Patient Profile Data Access Layer
// ==============================================================================

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import type { TransactionClient } from '../../../database/database.interface.js';
import type {
  CreatePatientProfileData,
  UpdatePatientProfileData,
  PatientProfile,
} from '../patient.interface.js';
import { generatePublicPatientId } from '../utils/patient-id.generator.js';

@Injectable()
export class PatientProfileRepository {
  private tx?: TransactionClient | undefined;

  constructor(private readonly prisma: PrismaService) {}

  public withTransaction(tx: TransactionClient): this {
    const cloned = new (this.constructor as new (prisma: PrismaService) => this)(this.prisma);
    cloned.tx = tx;
    return cloned;
  }

  private get client(): TransactionClient | PrismaService {
    return this.tx ?? this.prisma;
  }

  public async create(data: CreatePatientProfileData): Promise<PatientProfile> {
    const publicPatientId = data.publicPatientId ?? generatePublicPatientId();

    return this.client.patientProfile.create({
      data: {
        userId: data.userId,
        publicPatientId,
        legalFirstName: data.legalFirstName ?? null,
        legalLastName: data.legalLastName ?? null,
        dateOfBirth: data.dateOfBirth ?? null,
        biologicalSex: data.biologicalSex ?? null,
        bloodGroup: data.bloodGroup ?? null,
        emergencyContactName: data.emergencyContactName ?? null,
        emergencyContactPhone: data.emergencyContactPhone ?? null,
        emergencyContactRelationship: data.emergencyContactRelationship ?? null,
        preferredLanguage: data.preferredLanguage ?? 'en',
        timezone: data.timezone ?? 'UTC',
      },
    });
  }

  public async findByUserId(userId: string): Promise<PatientProfile | null> {
    return this.client.patientProfile.findUnique({
      where: { userId },
    });
  }

  public async findByPublicId(publicPatientId: string): Promise<PatientProfile | null> {
    return this.client.patientProfile.findUnique({
      where: { publicPatientId },
    });
  }

  public async findById(id: string): Promise<PatientProfile | null> {
    return this.client.patientProfile.findUnique({
      where: { id },
    });
  }

  public async updateByUserId(
    userId: string,
    data: UpdatePatientProfileData,
  ): Promise<PatientProfile> {
    return this.client.patientProfile.update({
      where: { userId },
      data: {
        ...(data.legalFirstName !== undefined && { legalFirstName: data.legalFirstName }),
        ...(data.legalLastName !== undefined && { legalLastName: data.legalLastName }),
        ...(data.dateOfBirth !== undefined && { dateOfBirth: data.dateOfBirth }),
        ...(data.biologicalSex !== undefined && { biologicalSex: data.biologicalSex }),
        ...(data.bloodGroup !== undefined && { bloodGroup: data.bloodGroup }),
        ...(data.emergencyContactName !== undefined && {
          emergencyContactName: data.emergencyContactName,
        }),
        ...(data.emergencyContactPhone !== undefined && {
          emergencyContactPhone: data.emergencyContactPhone,
        }),
        ...(data.emergencyContactRelationship !== undefined && {
          emergencyContactRelationship: data.emergencyContactRelationship,
        }),
        ...(data.preferredLanguage !== undefined && { preferredLanguage: data.preferredLanguage }),
        ...(data.timezone !== undefined && { timezone: data.timezone }),
      },
    });
  }

  public async deleteByUserId(userId: string): Promise<boolean> {
    const result = await this.client.patientProfile.deleteMany({
      where: { userId },
    });
    return result.count > 0;
  }
}

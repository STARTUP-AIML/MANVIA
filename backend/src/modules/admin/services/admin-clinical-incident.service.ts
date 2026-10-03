import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import { NotFoundError } from '../../../common/errors/app-error.js';
import type { BreakGlassAccessDto } from '../dto/break-glass-access.dto.js';
import { AdminAuditService } from './admin-audit.service.js';

@Injectable()
export class AdminClinicalIncidentService {
  private readonly logger = new Logger(AdminClinicalIncidentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AdminAuditService,
  ) {}

  public async executeBreakGlassAccess(
    dto: BreakGlassAccessDto,
    adminUserId: string,
    ipAddress?: string | null,
    userAgent?: string | null,
  ) {
    const patient = await this.prisma.patientProfile.findUnique({
      where: { id: dto.patientId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            status: true,
          },
        },
      },
    });

    if (!patient) {
      throw new NotFoundError(`Patient with id ${dto.patientId} not found`);
    }

    this.logger.warn(
      `[EMERGENCY BREAK-GLASS CLINICAL ACCESS] Admin ${adminUserId} accessed clinical records for patient ${patient.publicPatientId} under incident ${dto.incidentTicketId}. Justification: ${dto.justification}`,
    );

    // Record high-severity, immutable audit trail
    await this.auditService.recordAdminAction({
      actorUserId: adminUserId,
      action: 'ADMIN.BREAK_GLASS_CLINICAL_ACCESS',
      resourceType: 'PATIENT_CLINICAL_RECORD',
      resourceId: dto.patientId,
      status: 'SUCCESS',
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      details: {
        incidentTicketId: dto.incidentTicketId,
        justification: dto.justification,
        patientPublicId: patient.publicPatientId,
        acknowledgedTerms: dto.acknowledgedTerms,
        accessedAt: new Date().toISOString(),
      },
    });

    // Query clinical data scoped to this authorized emergency investigation
    const [healthRecords, wellnessMetrics] = await Promise.all([
      this.prisma.healthRecord.findMany({
        where: { patientId: dto.patientId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          publicRecordId: true,
          category: true,
          title: true,
          recordedDate: true,
          createdAt: true,
        },
      }),
      this.prisma.wellnessCheckIn.findMany({
        where: { patientId: dto.patientId },
        orderBy: { recordedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          recordedAt: true,
          mood: true,
          stress: true,
          energy: true,
          sleepQuality: true,
        },
      }),
    ]);

    return {
      breakGlassAccessId: crypto.randomUUID(),
      incidentTicketId: dto.incidentTicketId,
      justification: dto.justification,
      authorizedAt: new Date().toISOString(),
      patient: {
        id: patient.id,
        publicPatientId: patient.publicPatientId,
        displayName: patient.displayName,
        gender: patient.gender,
        bloodGroup: patient.bloodGroup,
        emergencyContactName: patient.emergencyContactName,
        preferredLanguage: patient.preferredLanguage,
      },
      clinicalRecords: {
        totalRecords: healthRecords.length,
        records: healthRecords,
        recentWellnessCheckIns: wellnessMetrics,
      },
    };
  }
}

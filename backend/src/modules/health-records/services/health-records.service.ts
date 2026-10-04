import { Inject, Injectable } from '@nestjs/common';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../common/errors/app-error.js';
import {
  HEALTH_RECORD_REPOSITORY,
  type IHealthRecordRepository,
} from '../interfaces/health-record-repository.interface.js';
import {
  HEALTH_RECORDS_AUDIT_SERVICE,
  type IHealthRecordsAuditService,
} from '../interfaces/health-records-audit-service.interface.js';
import {
  HEALTH_RECORDS_STORAGE_SERVICE,
  type IHealthRecordsStorageService,
} from '../interfaces/health-records-storage-service.interface.js';
import { HealthTimelineService } from './health-timeline.service.js';
import { CareRelationshipsService } from '../../care-relationships/services/care-relationships.service.js';
import {
  CARE_RELATIONSHIP_REPOSITORY,
  type ICareRelationshipRepository,
} from '../../care-relationships/interfaces/care-relationship-repository.interface.js';
import {
  DOCTORS_REPOSITORY,
  type IDoctorsRepository,
} from '../../doctors/interfaces/doctor-repository.interface.js';
import { VerificationStatus } from '../../doctors/enums/verification-status.enum.js';
import { CareRelationshipStatus } from '../../care-relationships/enums/care-relationship-status.enum.js';
import { ConsentScope } from '../../care-relationships/enums/consent-scope.enum.js';
import { ConsentStatus } from '../../care-relationships/enums/consent-status.enum.js';
import { HealthRecordStatus } from '../enums/health-record-status.enum.js';
import { TimelineEventType } from '../enums/timeline-event-type.enum.js';
import { generatePublicHealthRecordId } from '../utils/public-record-id.util.js';
import type { HealthRecordEntity } from '../entities/health-record.entity.js';
import type {
  CreateHealthRecordDto,
  CreateUploadIntentDto,
  DownloadUrlResponseDto,
  HealthRecordQueryDto,
  HealthRecordResponseDto,
  PaginatedHealthRecordsResponseDto,
  UpdateHealthRecordDto,
  UploadIntentResponseDto,
} from '../dto/index.js';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'text/plain',
]);

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

@Injectable()
export class HealthRecordsService {
  constructor(
    @Inject(HEALTH_RECORD_REPOSITORY)
    private readonly healthRecordRepo: IHealthRecordRepository,
    @Inject(HEALTH_RECORDS_STORAGE_SERVICE)
    private readonly storageService: IHealthRecordsStorageService,
    @Inject(HEALTH_RECORDS_AUDIT_SERVICE)
    private readonly auditService: IHealthRecordsAuditService,
    @Inject(HealthTimelineService)
    private readonly healthTimelineService: HealthTimelineService,
    @Inject(CareRelationshipsService)
    private readonly careRelService: CareRelationshipsService,
    @Inject(CARE_RELATIONSHIP_REPOSITORY)
    private readonly careRelRepo: ICareRelationshipRepository,
    @Inject(DOCTORS_REPOSITORY)
    private readonly doctorsRepo: IDoctorsRepository,
  ) {}

  /**
   * Generates a presigned upload intent and registers a pending health record.
   */
  public async createUploadIntent(
    userId: string,
    dto: CreateUploadIntentDto,
  ): Promise<UploadIntentResponseDto> {
    const patient = await this.careRelService.getOrCreatePatientProfile(userId);

    if (!ALLOWED_MIME_TYPES.has(dto.mimeType)) {
      throw new ValidationError(
        `Unsupported MIME type: ${dto.mimeType}. Allowed types: ${Array.from(ALLOWED_MIME_TYPES).join(', ')}`,
      );
    }

    if (dto.fileSizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new ValidationError(
        `File size exceeds maximum permitted limit of 25MB (${dto.fileSizeBytes} bytes provided)`,
      );
    }

    const publicRecordId = generatePublicHealthRecordId();
    const storageKey = `patients/${patient.id}/records/${publicRecordId}/${encodeURIComponent(dto.fileName)}`;
    const expiresInSeconds = 300; // 5 minutes

    const uploadUrl = await this.storageService.getUploadUrl(storageKey, expiresInSeconds);

    // Register pending health record
    const record = await this.healthRecordRepo.create({
      publicRecordId,
      patientId: patient.id,
      uploadedByUserId: userId,
      category: dto.category,
      title: dto.title,
      description: dto.description ?? null,
      storageKey,
      originalFileName: dto.fileName,
      mimeType: dto.mimeType,
      fileSizeBytes: dto.fileSizeBytes,
      status: HealthRecordStatus.PENDING,
      recordedDate: dto.recordedDate ? new Date(dto.recordedDate) : new Date(),
    });

    this.auditService.logEvent({
      event: 'HEALTH_RECORD_UPLOAD_INTENT',
      actorId: userId,
      role: 'PATIENT',
      resource: `HEALTH_RECORD:${publicRecordId}`,
      action: 'CREATE_UPLOAD_INTENT',
      metadata: {
        publicRecordId,
        patientId: patient.id,
        category: dto.category,
        fileSizeBytes: dto.fileSizeBytes,
      },
    });

    return {
      recordId: record.id,
      publicRecordId,
      uploadUrl,
      storageKey,
      expiresInSeconds,
      requiredHeaders: { 'Content-Type': dto.mimeType },
    };
  }

  /**
   * Finalizes an uploaded health record after file upload completes.
   * Transitions status to AVAILABLE and adds an entry to the patient's timeline.
   */
  public async finalizeUpload(
    userId: string,
    recordIdOrPublicId: string,
  ): Promise<HealthRecordResponseDto> {
    const patient = await this.careRelService.getOrCreatePatientProfile(userId);
    const record = await this.healthRecordRepo.findPatientRecord(patient.id, recordIdOrPublicId);

    if (!record || record.status === HealthRecordStatus.DELETED) {
      throw new NotFoundError(`Health record '${recordIdOrPublicId}' not found`);
    }

    const updated = await this.healthRecordRepo.update(record.id, {
      status: HealthRecordStatus.AVAILABLE,
    });

    // Create longitudinal timeline event
    await this.healthTimelineService.recordEvent({
      patientId: patient.id,
      eventType: TimelineEventType.HEALTH_RECORD_ADDED,
      title: updated.title,
      summary: `Health record added: ${updated.title} (${updated.category})`,
      sourceType: 'HEALTH_RECORD',
      sourceId: updated.publicRecordId,
      eventTimestamp: updated.recordedDate,
      metadata: {
        category: updated.category,
        originalFileName: updated.originalFileName,
        mimeType: updated.mimeType,
        fileSizeBytes: updated.fileSizeBytes,
      },
    });

    this.auditService.logEvent({
      event: 'HEALTH_RECORD_FINALIZED',
      actorId: userId,
      role: 'PATIENT',
      resource: `HEALTH_RECORD:${updated.publicRecordId}`,
      action: 'FINALIZE_UPLOAD',
      metadata: {
        publicRecordId: updated.publicRecordId,
        patientId: patient.id,
        category: updated.category,
      },
    });

    return this.mapToResponseDto(updated);
  }

  /**
   * Direct creation of an already-stored health record metadata entry.
   */
  public async createRecord(
    userId: string,
    dto: CreateHealthRecordDto,
  ): Promise<HealthRecordResponseDto> {
    const patient = await this.careRelService.getOrCreatePatientProfile(userId);

    if (!ALLOWED_MIME_TYPES.has(dto.fileMimeType)) {
      throw new ValidationError(
        `Unsupported MIME type: ${dto.fileMimeType}. Allowed types: ${Array.from(ALLOWED_MIME_TYPES).join(', ')}`,
      );
    }

    let fileSizeBytes = dto.fileSizeBytes;
    let buffer: Buffer | undefined;
    if (dto.fileContentBase64) {
      buffer = Buffer.from(dto.fileContentBase64, 'base64');
      fileSizeBytes = fileSizeBytes ?? buffer.length;
    } else {
      fileSizeBytes = fileSizeBytes ?? 1024;
    }

    if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new ValidationError(
        `File size exceeds maximum permitted limit of 25MB (${fileSizeBytes} bytes provided)`,
      );
    }

    const publicRecordId = generatePublicHealthRecordId();
    const storageKey = `patients/${patient.id}/records/${publicRecordId}/${encodeURIComponent(dto.fileName)}`;

    if (buffer) {
      await this.storageService.upload({
        key: storageKey,
        buffer,
        mimeType: dto.fileMimeType,
      });
    }

    const recordedDate = new Date(dto.recordedDate);

    const record = await this.healthRecordRepo.create({
      publicRecordId,
      patientId: patient.id,
      uploadedByUserId: userId,
      category: dto.category,
      title: dto.title,
      description: dto.description ?? null,
      storageKey,
      originalFileName: dto.fileName,
      mimeType: dto.fileMimeType,
      fileSizeBytes,
      sha256Hash: null,
      status: HealthRecordStatus.AVAILABLE,
      recordedDate,
    });

    // Create longitudinal timeline event
    await this.healthTimelineService.recordEvent({
      patientId: patient.id,
      eventType: TimelineEventType.HEALTH_RECORD_ADDED,
      title: record.title,
      summary: `Health record added: ${record.title} (${record.category})`,
      sourceType: 'HEALTH_RECORD',
      sourceId: record.publicRecordId,
      eventTimestamp: record.recordedDate,
      metadata: {
        category: record.category,
        originalFileName: record.originalFileName,
        mimeType: record.mimeType,
        fileSizeBytes: record.fileSizeBytes,
      },
    });

    this.auditService.logEvent({
      event: 'HEALTH_RECORD_CREATED',
      actorId: userId,
      role: 'PATIENT',
      resource: `HEALTH_RECORD:${record.publicRecordId}`,
      action: 'CREATE_RECORD',
      metadata: {
        publicRecordId: record.publicRecordId,
        patientId: patient.id,
        category: record.category,
      },
    });

    return this.mapToResponseDto(record);
  }

  /**
   * Retrieves paginated health records belonging to the authenticated patient.
   */
  public async getPatientRecords(
    userId: string,
    query: HealthRecordQueryDto,
  ): Promise<PaginatedHealthRecordsResponseDto> {
    const patient = await this.careRelService.getOrCreatePatientProfile(userId);
    const { startDate, endDate } = this.resolveDateRange(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const { data, total } = await this.healthRecordRepo.findMany({
      patientId: patient.id,
      category: query.category,
      status: query.status,
      startDate,
      endDate,
      page,
      limit,
    });

    this.auditService.logEvent({
      event: 'HEALTH_RECORDS_ACCESSED',
      actorId: userId,
      role: 'PATIENT',
      resource: `PATIENT_HEALTH_RECORDS:${patient.id}`,
      action: 'LIST_RECORDS',
      metadata: { total, page, limit },
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: data.map((r) => this.mapToResponseDto(r)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Retrieves a single health record by public ID or UUID for the authenticated patient.
   */
  public async getPatientRecordById(
    userId: string,
    recordIdOrPublicId: string,
  ): Promise<HealthRecordResponseDto> {
    const patient = await this.careRelService.getOrCreatePatientProfile(userId);
    const record = await this.healthRecordRepo.findPatientRecord(patient.id, recordIdOrPublicId);

    if (!record || record.status === HealthRecordStatus.DELETED) {
      throw new NotFoundError(`Health record '${recordIdOrPublicId}' not found`);
    }

    this.auditService.logEvent({
      event: 'HEALTH_RECORD_ACCESSED',
      actorId: userId,
      role: 'PATIENT',
      resource: `HEALTH_RECORD:${record.publicRecordId}`,
      action: 'GET_RECORD',
      metadata: { publicRecordId: record.publicRecordId, patientId: patient.id },
    });

    return this.mapToResponseDto(record);
  }

  /**
   * Generates a short-lived presigned download URL for the patient's record.
   */
  public async getRecordDownloadUrl(
    userId: string,
    recordIdOrPublicId: string,
  ): Promise<DownloadUrlResponseDto> {
    const patient = await this.careRelService.getOrCreatePatientProfile(userId);
    const record = await this.healthRecordRepo.findPatientRecord(patient.id, recordIdOrPublicId);

    if (!record || record.status === HealthRecordStatus.DELETED) {
      throw new NotFoundError(`Health record '${recordIdOrPublicId}' not found`);
    }

    const expiresInSeconds = 300; // 5 minutes
    const downloadUrl = await this.storageService.getSignedUrl(record.storageKey, expiresInSeconds);

    this.auditService.logEvent({
      event: 'HEALTH_RECORD_DOWNLOAD_URL_REQUESTED',
      actorId: userId,
      role: 'PATIENT',
      resource: `HEALTH_RECORD:${record.publicRecordId}`,
      action: 'DOWNLOAD_URL',
      metadata: { publicRecordId: record.publicRecordId, patientId: patient.id },
    });

    return {
      recordId: record.id,
      publicRecordId: record.publicRecordId,
      downloadUrl,
      expiresInSeconds,
    };
  }

  /**
   * Updates metadata on an existing health record.
   */
  public async updateRecord(
    userId: string,
    recordIdOrPublicId: string,
    dto: UpdateHealthRecordDto,
  ): Promise<HealthRecordResponseDto> {
    const patient = await this.careRelService.getOrCreatePatientProfile(userId);
    const record = await this.healthRecordRepo.findPatientRecord(patient.id, recordIdOrPublicId);

    if (!record || record.status === HealthRecordStatus.DELETED) {
      throw new NotFoundError(`Health record '${recordIdOrPublicId}' not found`);
    }

    const updated = await this.healthRecordRepo.update(record.id, {
      title: dto.title,
      description: dto.description,
      category: dto.category,
      recordedDate: dto.recordedDate ? new Date(dto.recordedDate) : undefined,
    });

    this.auditService.logEvent({
      event: 'HEALTH_RECORD_UPDATED',
      actorId: userId,
      role: 'PATIENT',
      resource: `HEALTH_RECORD:${record.publicRecordId}`,
      action: 'UPDATE_RECORD',
      metadata: { publicRecordId: record.publicRecordId, patientId: patient.id },
    });

    return this.mapToResponseDto(updated);
  }

  /**
   * Soft deletes / archives a health record without physical data loss.
   */
  public async deleteRecord(
    userId: string,
    recordIdOrPublicId: string,
  ): Promise<HealthRecordResponseDto> {
    const patient = await this.careRelService.getOrCreatePatientProfile(userId);
    const record = await this.healthRecordRepo.findPatientRecord(patient.id, recordIdOrPublicId);

    if (!record || record.status === HealthRecordStatus.DELETED) {
      throw new NotFoundError(`Health record '${recordIdOrPublicId}' not found`);
    }

    const deleted = await this.healthRecordRepo.softDelete(record.id);

    this.auditService.logEvent({
      event: 'HEALTH_RECORD_DELETED',
      actorId: userId,
      role: 'PATIENT',
      resource: `HEALTH_RECORD:${record.publicRecordId}`,
      action: 'SOFT_DELETE_RECORD',
      metadata: { publicRecordId: record.publicRecordId, patientId: patient.id },
    });

    return this.mapToResponseDto(deleted);
  }

  // ---------------------------------------------------------------------------
  // Doctor Access
  // ---------------------------------------------------------------------------

  /**
   * Retrieves paginated patient health records for an authorized physician.
   * Defensively checks verification, active care relationship, and HEALTH_RECORDS consent.
   */
  public async getDoctorPatientRecords(
    doctorUserId: string,
    targetPatientId: string,
    query: HealthRecordQueryDto,
  ): Promise<PaginatedHealthRecordsResponseDto> {
    const doctor = await this.doctorsRepo.findByUserId(doctorUserId);
    if (!doctor) {
      throw new NotFoundError('Doctor profile not found for authenticated user');
    }

    if (doctor.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new ForbiddenError(
        'Access denied: physician verification required to access patient health records',
      );
    }

    const patient = await this.resolvePatient(targetPatientId);

    const careRel = await this.careRelRepo.findCareRelationship(patient.id, doctor.id);
    if (!careRel || careRel.status !== CareRelationshipStatus.ACTIVE) {
      throw new ForbiddenError(
        'Access denied: active care relationship required to access patient health records',
      );
    }

    const activeConsents = await this.careRelRepo.findConsentsByPatientId(patient.id, true);
    const hasConsent = activeConsents.some(
      (c) =>
        c.doctorId === doctor.id &&
        c.scope === ConsentScope.HEALTH_RECORDS &&
        c.status === ConsentStatus.ACTIVE &&
        (!c.expiresAt || new Date(c.expiresAt).getTime() > Date.now()),
    );

    if (!hasConsent) {
      throw new ForbiddenError(
        'Access denied: explicit patient consent for HEALTH_RECORDS is required or has expired',
      );
    }

    const { startDate, endDate } = this.resolveDateRange(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const { data, total } = await this.healthRecordRepo.findMany({
      patientId: patient.id,
      category: query.category,
      status: query.status,
      startDate,
      endDate,
      page,
      limit,
    });

    this.auditService.logEvent({
      event: 'HEALTH_RECORDS_ACCESSED',
      actorId: doctorUserId,
      role: 'DOCTOR',
      resource: `PATIENT_HEALTH_RECORDS:${patient.id}`,
      action: 'DOCTOR_LIST_RECORDS',
      metadata: { doctorId: doctor.id, patientId: patient.id, total },
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: data.map((r) => this.mapToResponseDto(r)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Retrieves a single patient health record for an authorized physician.
   */
  public async getDoctorPatientRecordById(
    doctorUserId: string,
    targetPatientId: string,
    recordIdOrPublicId: string,
  ): Promise<HealthRecordResponseDto> {
    const doctor = await this.doctorsRepo.findByUserId(doctorUserId);
    if (!doctor) {
      throw new NotFoundError('Doctor profile not found for authenticated user');
    }

    if (doctor.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new ForbiddenError('Access denied: physician verification required');
    }

    const patient = await this.resolvePatient(targetPatientId);

    const careRel = await this.careRelRepo.findCareRelationship(patient.id, doctor.id);
    if (!careRel || careRel.status !== CareRelationshipStatus.ACTIVE) {
      throw new ForbiddenError('Access denied: active care relationship required');
    }

    const activeConsents = await this.careRelRepo.findConsentsByPatientId(patient.id, true);
    const hasConsent = activeConsents.some(
      (c) =>
        c.doctorId === doctor.id &&
        c.scope === ConsentScope.HEALTH_RECORDS &&
        c.status === ConsentStatus.ACTIVE &&
        (!c.expiresAt || new Date(c.expiresAt).getTime() > Date.now()),
    );

    if (!hasConsent) {
      throw new ForbiddenError(
        'Access denied: explicit patient consent for HEALTH_RECORDS required',
      );
    }

    const record = await this.healthRecordRepo.findPatientRecord(patient.id, recordIdOrPublicId);
    if (!record || record.status === HealthRecordStatus.DELETED) {
      throw new NotFoundError(`Health record '${recordIdOrPublicId}' not found`);
    }

    this.auditService.logEvent({
      event: 'HEALTH_RECORD_ACCESSED',
      actorId: doctorUserId,
      role: 'DOCTOR',
      resource: `HEALTH_RECORD:${record.publicRecordId}`,
      action: 'DOCTOR_GET_RECORD',
      metadata: {
        doctorId: doctor.id,
        patientId: patient.id,
        publicRecordId: record.publicRecordId,
      },
    });

    return this.mapToResponseDto(record);
  }

  /**
   * Generates a download URL for an authorized physician under explicit consent.
   */
  public async getDoctorPatientRecordDownloadUrl(
    doctorUserId: string,
    targetPatientId: string,
    recordIdOrPublicId: string,
  ): Promise<DownloadUrlResponseDto> {
    const doctor = await this.doctorsRepo.findByUserId(doctorUserId);
    if (!doctor) {
      throw new NotFoundError('Doctor profile not found for authenticated user');
    }

    if (doctor.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new ForbiddenError('Access denied: physician verification required');
    }

    const patient = await this.resolvePatient(targetPatientId);

    const careRel = await this.careRelRepo.findCareRelationship(patient.id, doctor.id);
    if (!careRel || careRel.status !== CareRelationshipStatus.ACTIVE) {
      throw new ForbiddenError('Access denied: active care relationship required');
    }

    const activeConsents = await this.careRelRepo.findConsentsByPatientId(patient.id, true);
    const hasConsent = activeConsents.some(
      (c) =>
        c.doctorId === doctor.id &&
        c.scope === ConsentScope.HEALTH_RECORDS &&
        c.status === ConsentStatus.ACTIVE &&
        (!c.expiresAt || new Date(c.expiresAt).getTime() > Date.now()),
    );

    if (!hasConsent) {
      throw new ForbiddenError(
        'Access denied: explicit patient consent for HEALTH_RECORDS required',
      );
    }

    const record = await this.healthRecordRepo.findPatientRecord(patient.id, recordIdOrPublicId);
    if (!record || record.status === HealthRecordStatus.DELETED) {
      throw new NotFoundError(`Health record '${recordIdOrPublicId}' not found`);
    }

    const expiresInSeconds = 300;
    const downloadUrl = await this.storageService.getSignedUrl(record.storageKey, expiresInSeconds);

    this.auditService.logEvent({
      event: 'HEALTH_RECORD_DOWNLOAD_URL_REQUESTED',
      actorId: doctorUserId,
      role: 'DOCTOR',
      resource: `HEALTH_RECORD:${record.publicRecordId}`,
      action: 'DOCTOR_DOWNLOAD_URL',
      metadata: {
        doctorId: doctor.id,
        patientId: patient.id,
        publicRecordId: record.publicRecordId,
      },
    });

    return {
      recordId: record.id,
      publicRecordId: record.publicRecordId,
      downloadUrl,
      expiresInSeconds,
    };
  }

  /**
   * Downloads the raw document buffer for an authenticated patient.
   */
  public async downloadPatientRecord(
    userId: string,
    recordIdOrPublicId: string,
  ): Promise<{ buffer: Buffer; mimeType: string; originalFileName: string }> {
    const patient = await this.careRelService.getOrCreatePatientProfile(userId);
    const record = await this.healthRecordRepo.findPatientRecord(patient.id, recordIdOrPublicId);

    if (!record || record.status === HealthRecordStatus.DELETED) {
      throw new NotFoundError(`Health record '${recordIdOrPublicId}' not found`);
    }

    const buffer = await this.storageService.download(record.storageKey);

    this.auditService.logEvent({
      event: 'HEALTH_RECORD_FILE_ACCESSED',
      actorId: userId,
      role: 'PATIENT',
      resource: `HEALTH_RECORD:${record.publicRecordId}`,
      action: 'DOWNLOAD_RECORD',
      metadata: { publicRecordId: record.publicRecordId, patientId: patient.id },
    });

    return {
      buffer,
      mimeType: record.mimeType,
      originalFileName: record.originalFileName,
    };
  }

  /**
   * Downloads the raw document buffer for an authorized physician under explicit consent.
   */
  public async downloadDoctorPatientRecord(
    doctorUserId: string,
    targetPatientId: string,
    recordIdOrPublicId: string,
  ): Promise<{ buffer: Buffer; mimeType: string; originalFileName: string }> {
    const doctor = await this.doctorsRepo.findByUserId(doctorUserId);
    if (!doctor) {
      throw new NotFoundError('Doctor profile not found for authenticated user');
    }

    if (doctor.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new ForbiddenError('Access denied: physician verification required');
    }

    const patient = await this.resolvePatient(targetPatientId);

    const careRel = await this.careRelRepo.findCareRelationship(patient.id, doctor.id);
    if (!careRel || careRel.status !== CareRelationshipStatus.ACTIVE) {
      throw new ForbiddenError('Access denied: active care relationship required');
    }

    const activeConsents = await this.careRelRepo.findConsentsByPatientId(patient.id, true);
    const hasConsent = activeConsents.some(
      (c) =>
        c.doctorId === doctor.id &&
        c.scope === ConsentScope.HEALTH_RECORDS &&
        c.status === ConsentStatus.ACTIVE &&
        (!c.expiresAt || new Date(c.expiresAt).getTime() > Date.now()),
    );

    if (!hasConsent) {
      throw new ForbiddenError(
        'Access denied: explicit patient consent for HEALTH_RECORDS required',
      );
    }

    const record = await this.healthRecordRepo.findPatientRecord(patient.id, recordIdOrPublicId);
    if (!record || record.status === HealthRecordStatus.DELETED) {
      throw new NotFoundError(`Health record '${recordIdOrPublicId}' not found`);
    }

    const buffer = await this.storageService.download(record.storageKey);

    this.auditService.logEvent({
      event: 'DOCTOR_ACCESSED_PATIENT_HEALTH_RECORD_FILE',
      actorId: doctorUserId,
      role: 'DOCTOR',
      resource: `HEALTH_RECORD:${record.publicRecordId}`,
      action: 'DOCTOR_DOWNLOAD_RECORD',
      metadata: {
        doctorId: doctor.id,
        patientId: patient.id,
        publicRecordId: record.publicRecordId,
      },
    });

    return {
      buffer,
      mimeType: record.mimeType,
      originalFileName: record.originalFileName,
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async resolvePatient(patientId: string) {
    const patient = patientId.startsWith('PAT-')
      ? await this.careRelRepo.findPatientByPublicId(patientId)
      : await this.careRelRepo.findPatientById(patientId);

    if (!patient) {
      throw new NotFoundError('Patient resource not found');
    }
    return patient;
  }

  private resolveDateRange(query: HealthRecordQueryDto): {
    startDate?: Date | undefined;
    endDate?: Date | undefined;
  } {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    if (startDate && isNaN(startDate.getTime())) {
      throw new ValidationError('Invalid startDate format');
    }
    if (endDate && isNaN(endDate.getTime())) {
      throw new ValidationError('Invalid endDate format');
    }
    if (startDate && endDate && startDate > endDate) {
      throw new ValidationError('startDate cannot be after endDate');
    }

    return { startDate, endDate };
  }

  private mapToResponseDto(entity: HealthRecordEntity): HealthRecordResponseDto {
    return {
      id: entity.id,
      publicRecordId: entity.publicRecordId,
      patientId: entity.patientId,
      category: entity.category,
      title: entity.title,
      description: entity.description,
      originalFileName: entity.originalFileName,
      mimeType: entity.mimeType,
      fileSizeBytes: entity.fileSizeBytes,
      status: entity.status,
      recordedDate: entity.recordedDate.toISOString(),
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}

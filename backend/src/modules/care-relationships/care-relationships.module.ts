import { Module } from '@nestjs/common';
import { DoctorsModule } from '../doctors/doctors.module.js';
import { PatientCareRelationshipsController } from './controllers/patient-care-relationships.controller.js';
import { PatientConsentsController } from './controllers/patient-consents.controller.js';
import { DoctorCareRelationshipsController } from './controllers/doctor-care-relationships.controller.js';
import { CareRelationshipsService } from './services/care-relationships.service.js';
import { ConsentsService } from './services/consents.service.js';
import { ResourceAuthorizationService } from './services/resource-authorization.service.js';
import { ConsentAuditService } from './services/consent-audit.service.js';
import { PatientAuthGuard } from './guards/patient-auth.guard.js';
import { CareRelationshipGuard } from './guards/care-relationship.guard.js';
import { ConsentGuard } from './guards/consent.guard.js';
import { InMemoryCareRelationshipRepository } from './repositories/in-memory-care-relationship.repository.js';
import { PrismaCareRelationshipRepository } from './repositories/prisma-care-relationship.repository.js';
import { CARE_RELATIONSHIP_REPOSITORY } from './interfaces/care-relationship-repository.interface.js';
import { RESOURCE_AUTHORIZATION_SERVICE } from './interfaces/resource-authorization.interface.js';
import { CONSENT_AUDIT_SERVICE } from './interfaces/consent-audit-service.interface.js';

@Module({
  imports: [DoctorsModule],
  controllers: [
    PatientCareRelationshipsController,
    PatientConsentsController,
    DoctorCareRelationshipsController,
  ],
  providers: [
    CareRelationshipsService,
    ConsentsService,
    ResourceAuthorizationService,
    ConsentAuditService,
    PatientAuthGuard,
    CareRelationshipGuard,
    ConsentGuard,
    InMemoryCareRelationshipRepository,
    PrismaCareRelationshipRepository,
    {
      provide: CARE_RELATIONSHIP_REPOSITORY,
      useClass: InMemoryCareRelationshipRepository,
    },
    {
      provide: RESOURCE_AUTHORIZATION_SERVICE,
      useExisting: ResourceAuthorizationService,
    },
    {
      provide: CONSENT_AUDIT_SERVICE,
      useClass: ConsentAuditService,
    },
  ],
  exports: [
    CareRelationshipsService,
    ConsentsService,
    ResourceAuthorizationService,
    CARE_RELATIONSHIP_REPOSITORY,
    RESOURCE_AUTHORIZATION_SERVICE,
    CONSENT_AUDIT_SERVICE,
    PatientAuthGuard,
    CareRelationshipGuard,
    ConsentGuard,
  ],
})
export class CareRelationshipsModule {}

import { Inject, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../../../common/errors/app-error.js';
import {
  CARE_RELATIONSHIP_REPOSITORY,
  type ICareRelationshipRepository,
} from '../interfaces/care-relationship-repository.interface.js';
import {
  DOCTORS_REPOSITORY,
  type IDoctorsRepository,
} from '../../doctors/interfaces/doctor-repository.interface.js';
import { REQUIRE_CONSENT_SCOPE_KEY } from '../decorators/require-consent.decorator.js';
import { ConsentScope } from '../enums/consent-scope.enum.js';
import { ConsentStatus } from '../enums/consent-status.enum.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';

@Injectable()
export class ConsentGuard implements CanActivate {
  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
    @Inject(CARE_RELATIONSHIP_REPOSITORY)
    private readonly careRelRepo: ICareRelationshipRepository,
    @Inject(DOCTORS_REPOSITORY)
    private readonly doctorsRepo: IDoctorsRepository,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredScope = this.reflector.getAllAndOverride<ConsentScope>(
      REQUIRE_CONSENT_SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredScope) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: CurrentUserContext | undefined = request.user;

    if (!user || !user.userId) {
      throw new UnauthorizedError('Authentication credentials required');
    }

    // Patients always have intrinsic access to their own data
    if (user.activeRole === 'PATIENT') {
      return true;
    }

    if (user.activeRole !== 'DOCTOR') {
      throw new ForbiddenError('Access denied: provider consent verification required');
    }

    const patient =
      request.patientProfile ?? (await this.resolvePatient(this.extractPatientId(request)));

    if (!patient) {
      throw new NotFoundError('Patient resource not found');
    }

    const doctor = await this.doctorsRepo.findByUserId(user.userId);
    if (!doctor) {
      throw new ForbiddenError('Access denied: doctor profile not found');
    }

    const consent = await this.careRelRepo.findActiveConsent(patient.id, doctor.id, requiredScope);

    if (!consent || consent.status !== ConsentStatus.ACTIVE) {
      throw new ForbiddenError(
        `Access denied: patient has not granted active consent for scope '${requiredScope}'`,
      );
    }

    // Evaluate temporal expiration
    if (consent.expiresAt && new Date() >= consent.expiresAt) {
      throw new ForbiddenError(
        `Access denied: patient consent for scope '${requiredScope}' has expired`,
      );
    }

    request.activeConsent = consent;
    return true;
  }

  private extractPatientId(request: {
    params?: Record<string, string>;
    query?: Record<string, string>;
    body?: Record<string, string>;
  }): string | undefined {
    return (
      request.params?.patientId ??
      request.params?.id ??
      request.query?.patientId ??
      request.body?.patientId
    );
  }

  private async resolvePatient(patientId?: string) {
    if (!patientId) return null;
    return patientId.startsWith('PAT-')
      ? await this.careRelRepo.findPatientByPublicId(patientId)
      : await this.careRelRepo.findPatientById(patientId);
  }
}

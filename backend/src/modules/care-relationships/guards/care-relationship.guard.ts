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
import { REQUIRE_CARE_RELATIONSHIP_KEY } from '../decorators/require-care-relationship.decorator.js';
import { CareRelationshipStatus } from '../enums/care-relationship-status.enum.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';

@Injectable()
export class CareRelationshipGuard implements CanActivate {
  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
    @Inject(CARE_RELATIONSHIP_REPOSITORY)
    private readonly careRelRepo: ICareRelationshipRepository,
    @Inject(DOCTORS_REPOSITORY)
    private readonly doctorsRepo: IDoctorsRepository,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const isRequired = this.reflector.getAllAndOverride<boolean>(REQUIRE_CARE_RELATIONSHIP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isRequired) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: CurrentUserContext | undefined = request.user;

    if (!user || !user.userId) {
      throw new UnauthorizedError('Authentication credentials required');
    }

    // Patients always have intrinsic access to their own resources
    if (user.activeRole === 'PATIENT') {
      return true;
    }

    if (user.activeRole !== 'DOCTOR') {
      throw new ForbiddenError('Access denied: provider care relationship required');
    }

    const patientId = this.extractPatientId(request);
    if (!patientId) {
      throw new ForbiddenError('Access denied: target patient identifier could not be determined');
    }

    // Resolve patient (supports public ID or internal UUID)
    const patient = patientId.startsWith('PAT-')
      ? await this.careRelRepo.findPatientByPublicId(patientId)
      : await this.careRelRepo.findPatientById(patientId);

    if (!patient) {
      // Return 404 to avoid leaking patient existence to unauthorized callers
      throw new NotFoundError('Patient resource not found');
    }

    const doctor = await this.doctorsRepo.findByUserId(user.userId);
    if (!doctor) {
      throw new ForbiddenError('Access denied: doctor profile not found');
    }

    const relationship = await this.careRelRepo.findCareRelationship(patient.id, doctor.id);
    if (!relationship || relationship.status !== CareRelationshipStatus.ACTIVE) {
      throw new ForbiddenError(
        'Access denied: no active care relationship exists between provider and patient',
      );
    }

    request.careRelationship = relationship;
    request.patientProfile = patient;
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
}

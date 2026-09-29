import { Inject, Injectable } from '@nestjs/common';
import {
  DOCTORS_REPOSITORY,
  type IDoctorsRepository,
} from '../interfaces/doctor-repository.interface.js';
import type { SpecialtyResponseDto, LanguageResponseDto } from '../dto/taxonomy.dto.js';

@Injectable()
export class TaxonomyService {
  constructor(
    @Inject(DOCTORS_REPOSITORY)
    private readonly repository: IDoctorsRepository,
  ) {}

  public async getActiveSpecialties(): Promise<SpecialtyResponseDto[]> {
    const list = await this.repository.findActiveSpecialties();
    return list.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      description: s.description ?? null,
      isActive: s.isActive,
    }));
  }

  public async getAllLanguages(): Promise<LanguageResponseDto[]> {
    const list = await this.repository.findAllLanguages();
    return list.map((l) => ({
      id: l.id,
      code: l.code,
      name: l.name,
    }));
  }
}

import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryDoctorsRepository } from '../../src/modules/doctors/repositories/in-memory-doctors.repository.js';
import { TaxonomyService } from '../../src/modules/doctors/services/taxonomy.service.js';

describe('TaxonomyService', () => {
  let repository: InMemoryDoctorsRepository;
  let service: TaxonomyService;

  beforeEach(() => {
    repository = new InMemoryDoctorsRepository();
    service = new TaxonomyService(repository);
  });

  it('should list all active default specialties', async () => {
    const specialties = await service.getActiveSpecialties();
    expect(specialties.length).toBeGreaterThanOrEqual(7);

    const codes = specialties.map((s) => s.code);
    expect(codes).toContain('INTERNAL_MED');
    expect(codes).toContain('CARDIO');
    expect(codes).toContain('NEURO');
    expect(codes).toContain('PEDIATRICS');
    expect(codes).toContain('DERMATOLOGY');
    expect(codes).toContain('PSYCHIATRY');
    expect(codes).toContain('GENERAL_PRACTICE');

    for (const spec of specialties) {
      expect(spec.isActive).toBe(true);
      expect(spec.id).toBeDefined();
      expect(spec.name).toBeDefined();
    }
  });

  it('should list supported languages', async () => {
    const languages = await service.getAllLanguages();
    expect(languages.length).toBeGreaterThanOrEqual(6);

    const codes = languages.map((l) => l.code);
    expect(codes).toContain('en');
    expect(codes).toContain('es');
    expect(codes).toContain('hi');
    expect(codes).toContain('te');
    expect(codes).toContain('fr');
    expect(codes).toContain('de');
  });
});

import type { PrismaService } from '../prisma.service.js';

export const BASELINE_SPECIALTIES = [
  {
    code: 'INTERNAL_MED',
    name: 'Internal Medicine',
    description: 'Comprehensive adult health and chronic disease care',
  },
  {
    code: 'CARDIO',
    name: 'Cardiology',
    description: 'Disorders of the heart and cardiovascular system',
  },
  {
    code: 'NEURO',
    name: 'Neurology',
    description: 'Disorders of the nervous system and brain',
  },
  {
    code: 'PEDIATRICS',
    name: 'Pediatrics',
    description: 'Medical care of infants, children, and adolescents',
  },
  {
    code: 'DERMATOLOGY',
    name: 'Dermatology',
    description: 'Skin, hair, and nail health and pathologies',
  },
  {
    code: 'PSYCHIATRY',
    name: 'Psychiatry',
    description: 'Mental health, behavioral conditions, and psychotherapy',
  },
  {
    code: 'GENERAL_PRACTICE',
    name: 'General Practice',
    description: 'Primary outpatient medical consultations',
  },
];

export const BASELINE_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'hi', name: 'Hindi' },
  { code: 'te', name: 'Telugu' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
];

/**
 * Idempotently seeds baseline specialties and languages into the PostgreSQL database.
 */
export async function seedTaxonomies(prisma: PrismaService): Promise<void> {
  for (const s of BASELINE_SPECIALTIES) {
    await prisma.specialty.upsert({
      where: { code: s.code },
      update: {
        name: s.name,
        description: s.description,
        isActive: true,
      },
      create: {
        code: s.code,
        name: s.name,
        description: s.description,
        isActive: true,
      },
    });
  }

  for (const l of BASELINE_LANGUAGES) {
    await prisma.language.upsert({
      where: { code: l.code },
      update: { name: l.name },
      create: { code: l.code, name: l.name },
    });
  }
}

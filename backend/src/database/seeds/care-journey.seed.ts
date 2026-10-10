import { PrismaService } from '../prisma.service.js';
import { ConfigService } from '../../config/config.service.js';
import { seedTaxonomies } from './taxonomy.seed.js';
import { DayOfWeek } from '../../modules/doctor-availability/enums/day-of-week.enum.js';
import { ConsultationType } from '../../modules/doctor-availability/enums/consultation-type.enum.js';
import { OfferStatus } from '../../modules/doctor-availability/enums/offer-status.enum.js';
import { VerificationStatus } from '../../modules/doctors/enums/verification-status.enum.js';

/**
 * Seeds or completes the care journey foundation (specialties, languages, offers, availability)
 * for verified physicians in PostgreSQL. Fully idempotent and non-destructive.
 */
export async function seedCareJourney(prisma: PrismaService): Promise<void> {
  // 1. Seed specialties & languages
  await seedTaxonomies(prisma);

  const specialties = await prisma.specialty.findMany({ where: { isActive: true } });
  const languages = await prisma.language.findMany();

  const english = languages.find((l) => l.code === 'en') ?? languages[0];
  const spanish = languages.find((l) => l.code === 'es') ?? languages[1];

  // 2. Fetch existing verified doctors
  const doctors = await prisma.doctorProfile.findMany({
    where: { verificationStatus: VerificationStatus.VERIFIED },
    include: {
      specialties: true,
      languages: true,
      consultationOffers: true,
      availabilities: true,
    },
  });

  if (doctors.length === 0) {
    console.log('[CareJourneySeed] No verified doctors found to seed.');
    return;
  }

  console.log(`[CareJourneySeed] Processing ${doctors.length} verified doctors...`);

  // Map doctors to realistic clinical specialties based on name or index
  for (let i = 0; i < doctors.length; i++) {
    const doc = doctors[i];
    if (!doc) continue;
    const specialtyIndex = i % specialties.length;
    const primarySpec = specialties[specialtyIndex];
    const secondarySpec = specialties[(specialtyIndex + 1) % specialties.length];

    // Assign specialties if missing
    if (doc.specialties.length === 0 && primarySpec) {
      await prisma.doctorSpecialty.create({
        data: {
          doctorId: doc.id,
          specialtyId: primarySpec.id,
          isPrimary: true,
        },
      });

      if (secondarySpec && secondarySpec.id !== primarySpec.id) {
        await prisma.doctorSpecialty.create({
          data: {
            doctorId: doc.id,
            specialtyId: secondarySpec.id,
            isPrimary: false,
          },
        });
      }
    }

    // Assign languages if missing
    if (doc.languages.length === 0 && english) {
      await prisma.doctorLanguage.create({
        data: {
          doctorId: doc.id,
          languageId: english.id,
        },
      });
      if (spanish && i % 2 === 0) {
        await prisma.doctorLanguage.create({
          data: {
            doctorId: doc.id,
            languageId: spanish.id,
          },
        });
      }
    }

    // Assign consultation offers if missing
    if (doc.consultationOffers.length === 0) {
      const baseFee =
        Number(doc.defaultConsultationFee) > 0 ? Number(doc.defaultConsultationFee) : 150;

      await prisma.consultationOffer.createMany({
        data: [
          {
            doctorId: doc.id,
            title: 'Initial Consultation',
            description:
              'Comprehensive clinical evaluation and treatment planning for new concerns.',
            consultationType: ConsultationType.INITIAL,
            durationMinutes: 30,
            fee: baseFee,
            currency: doc.currency || 'USD',
            status: OfferStatus.ACTIVE,
          },
          {
            doctorId: doc.id,
            title: 'Follow-up Consultation',
            description:
              'Review treatment response, medication tolerance, and recovery milestones.',
            consultationType: ConsultationType.FOLLOW_UP,
            durationMinutes: 15,
            fee: Math.round(baseFee * 0.75),
            currency: doc.currency || 'USD',
            status: OfferStatus.ACTIVE,
          },
          {
            doctorId: doc.id,
            title: 'Specialist Evaluation',
            description:
              'Detailed diagnostic assessment, second opinions, and specialized therapy plan.',
            consultationType: ConsultationType.SPECIALIST,
            durationMinutes: 45,
            fee: Math.round(baseFee * 1.5),
            currency: doc.currency || 'USD',
            status: OfferStatus.ACTIVE,
          },
        ],
      });
    }

    // Assign availability if missing
    if (doc.availabilities.length === 0) {
      const weekdays = [
        DayOfWeek.MONDAY,
        DayOfWeek.TUESDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.THURSDAY,
        DayOfWeek.FRIDAY,
      ];

      await prisma.doctorAvailability.createMany({
        data: weekdays.map((dayOfWeek) => ({
          doctorId: doc.id,
          timezone: 'UTC',
          dayOfWeek,
          startTime: '09:00',
          endTime: '17:00',
          isActive: true,
        })),
      });
    }
  }

  console.log('[CareJourneySeed] Care journey baseline seeding complete.');
}

// Standalone execution runner
if (process.argv[1] && process.argv[1].includes('care-journey.seed')) {
  const configService = new ConfigService();
  const prisma = new PrismaService(configService);

  prisma
    .onModuleInit()
    .then(async () => {
      await seedCareJourney(prisma);
      await prisma.onApplicationShutdown();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[CareJourneySeed Error]', err);
      await prisma.onApplicationShutdown();
      process.exit(1);
    });
}

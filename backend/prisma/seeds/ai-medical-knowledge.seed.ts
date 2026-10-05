import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: process.cwd().endsWith('backend') ? '.env' : 'backend/.env' });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedMedicalKnowledge() {
  console.log('[Seed] Seeding Official Medical Knowledge Base...');

  const sources = [
    {
      publicSourceId: 'SRC-WHO-PA2020',
      title: 'WHO Guidelines on Physical Activity and Sedentary Behaviour',
      organization: 'World Health Organization',
      sourceType: 'OFFICIAL_GUIDELINE',
      version: '2020.1',
      trustStatus: 'OFFICIAL_HEALTH_AUTHORITY',
      isActive: true,
      document: {
        documentIdentifier: 'DOC-WHO-PA-ADULTS',
        title: 'Physical Activity Recommendations for Adults Aged 18–64',
        chunk: {
          chunkIdentifier: 'CHK-WHO-PA-001',
          keywords: [
            'physical activity',
            'exercise',
            'aerobic',
            'moderate exercise',
            'cardiovascular health',
            'sedentary',
            'walking',
          ],
          content:
            'Adults aged 18–64 years should do at least 150–300 minutes of moderate-intensity aerobic physical activity, or at least 75–150 minutes of vigorous-intensity aerobic physical activity throughout the week. Muscle-strengthening activities involving major muscle groups should be done on 2 or more days a week.',
          relevanceScore: 0.95,
        },
      },
    },
    {
      publicSourceId: 'SRC-ICMR-NIN2024',
      title: 'Dietary Guidelines for Indians',
      organization: 'Indian Council of Medical Research / National Institute of Nutrition',
      sourceType: 'GOVERNMENT_HEALTH_GUIDELINE',
      version: '2024.1',
      trustStatus: 'OFFICIAL_HEALTH_AUTHORITY',
      isActive: true,
      document: {
        documentIdentifier: 'DOC-ICMR-DIET-2024',
        title: 'Foundations of Balanced Nutrition and Non-Communicable Disease Prevention',
        chunk: {
          chunkIdentifier: 'CHK-ICMR-NUT-001',
          keywords: [
            'nutrition',
            'diet',
            'salt',
            'sugar',
            'balanced diet',
            'icmr',
            'fiber',
            'food',
          ],
          content:
            'A balanced diet should provide at least 50-60% of total energy from carbohydrates (predominantly complex carbohydrates), about 10-15% from proteins, and 20-30% from healthy fats. Daily salt intake should not exceed 5 grams (1 teaspoon) to prevent hypertension, and free added sugar intake should be restricted below 25 grams per day.',
          relevanceScore: 0.96,
        },
      },
    },
    {
      publicSourceId: 'SRC-WHO-MNH2023',
      title: 'WHO Mental Health Gap Action Programme (mhGAP) Guideline',
      organization: 'World Health Organization',
      sourceType: 'CLINICAL_PRACTICE_GUIDELINE',
      version: '3.0',
      trustStatus: 'OFFICIAL_HEALTH_AUTHORITY',
      isActive: true,
      document: {
        documentIdentifier: 'DOC-WHO-STR-2023',
        title: 'Evidence-Based Stress Management and Psychological Well-Being',
        chunk: {
          chunkIdentifier: 'CHK-WHO-STR-001',
          keywords: [
            'stress',
            'anxiety',
            'breathing',
            'relaxation',
            'mindfulness',
            'sleep hygiene',
            'mental health',
          ],
          content:
            'Evidence-based non-pharmacological interventions for stress reduction include slow diaphragmatic breathing (4-second inhale, 6-second exhale), progressive muscle relaxation, structured daytime cognitive rest periods, and maintaining consistent circadian sleep-wake cycles.',
          relevanceScore: 0.94,
        },
      },
    },
    {
      publicSourceId: 'SRC-AHA-ACC2024',
      title: 'Guidelines for the Prevention and Management of High Blood Pressure',
      organization: 'American Heart Association / ACC',
      sourceType: 'CLINICAL_GUIDELINE',
      version: '2024.2',
      trustStatus: 'OFFICIAL_HEALTH_AUTHORITY',
      isActive: true,
      document: {
        documentIdentifier: 'DOC-AHA-BP-2024',
        title: 'Guidelines for the Prevention and Management of High Blood Pressure',
        chunk: {
          chunkIdentifier: 'CHK-AHA-BP-001',
          keywords: [
            'hypertension',
            'blood pressure',
            'bp',
            'sodium',
            'potassium',
            'dash diet',
            'heart health',
          ],
          content:
            'In adults with elevated blood pressure or hypertension, non-pharmacological lifestyle therapy reduces systolic blood pressure by 4-11 mm Hg. Key recommendations include dietary sodium reduction (< 1500 mg/day optimal), increased dietary potassium, adherence to the DASH diet, and moderation of alcohol intake.',
          relevanceScore: 0.97,
        },
      },
    },
    {
      publicSourceId: 'SRC-CDC-HYD2024',
      title: 'CDC Water, Sanitation and Health Guidelines: Daily Fluid Requirements',
      organization: 'Centers for Disease Control and Prevention',
      sourceType: 'PUBLIC_HEALTH_ADVISORY',
      version: '2024.1',
      trustStatus: 'OFFICIAL_HEALTH_AUTHORITY',
      isActive: true,
      document: {
        documentIdentifier: 'DOC-CDC-HYD-2024',
        title: 'Hydration Recommendations for Metabolic and Renal Support',
        chunk: {
          chunkIdentifier: 'CHK-CDC-HYD-001',
          keywords: ['water', 'hydration', 'fluid intake', 'dehydration', 'fluids'],
          content:
            'Daily total water intake should average approximately 3.7 liters for men and 2.7 liters for women from all foods and beverages. Plain drinking water is the healthiest beverage choice to support kidney function, cellular homeostasis, and temperature regulation without unnecessary caloric or additive load.',
          relevanceScore: 0.92,
        },
      },
    },
  ];

  for (const src of sources) {
    const existingSource = await prisma.aIMedicalSource.findUnique({
      where: { publicSourceId: src.publicSourceId },
    });

    let sourceId = existingSource?.id;
    if (!existingSource) {
      const createdSource = await prisma.aIMedicalSource.create({
        data: {
          publicSourceId: src.publicSourceId,
          title: src.title,
          organization: src.organization,
          sourceType: src.sourceType,
          version: src.version,
          trustStatus: src.trustStatus,
          isActive: src.isActive,
        },
      });
      sourceId = createdSource.id;
    } else {
      await prisma.aIMedicalSource.update({
        where: { id: existingSource.id },
        data: {
          title: src.title,
          organization: src.organization,
          trustStatus: src.trustStatus,
        },
      });
    }

    if (!sourceId) continue;

    const existingDoc = await prisma.aIMedicalDocument.findUnique({
      where: {
        sourceId_documentIdentifier: {
          sourceId,
          documentIdentifier: src.document.documentIdentifier,
        },
      },
    });

    let documentId = existingDoc?.id;
    if (!existingDoc) {
      const createdDoc = await prisma.aIMedicalDocument.create({
        data: {
          sourceId,
          documentIdentifier: src.document.documentIdentifier,
          title: src.document.title,
          chunkCount: 1,
        },
      });
      documentId = createdDoc.id;
    } else {
      await prisma.aIMedicalDocument.update({
        where: { id: existingDoc.id },
        data: {
          title: src.document.title,
        },
      });
    }

    if (!documentId) continue;

    const existingChunk = await prisma.aIMedicalChunk.findFirst({
      where: {
        documentId,
        chunkIdentifier: src.document.chunk.chunkIdentifier,
      },
    });

    if (!existingChunk) {
      await prisma.aIMedicalChunk.create({
        data: {
          documentId,
          chunkIdentifier: src.document.chunk.chunkIdentifier,
          keywords: src.document.chunk.keywords,
          content: src.document.chunk.content,
          relevanceScore: src.document.chunk.relevanceScore,
        },
      });
    }
  }

  console.log('[Seed] Official Medical Knowledge Base seeded successfully.');
}

seedMedicalKnowledge()
  .catch((err) => {
    console.error('[Seed Error]', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

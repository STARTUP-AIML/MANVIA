import { Injectable } from '@nestjs/common';
import {
  type MedicalRetriever,
  type MedicalRetrievalResult,
  type MedicalEvidenceChunk,
} from './medical-retriever.interface.js';

interface SyntheticDoc {
  keywords: string[];
  sourceId: string;
  sourceTitle: string;
  organization: string;
  documentIdentifier: string;
  chunkIdentifier: string;
  content: string;
  relevance: number;
}

@Injectable()
export class MockMedicalRetriever implements MedicalRetriever {
  private readonly syntheticKnowledgeBase: SyntheticDoc[] = [
    {
      keywords: ['hypertension', 'blood pressure', 'bp'],
      sourceId: 'SRC-AHA2024',
      sourceTitle: 'Guidelines for the Prevention and Management of High Blood Pressure',
      organization: 'American Heart Association / ACC',
      documentIdentifier: 'DOC-AHA-HTN-2024',
      chunkIdentifier: 'CHK-HTN-001',
      content:
        'Normal adult blood pressure is defined as systolic < 120 mm Hg and diastolic < 80 mm Hg. Lifestyle interventions include sodium reduction, physical activity, and balanced nutrition.',
      relevance: 0.94,
    },
    {
      keywords: ['sleep', 'insomnia', 'rest', 'bedtime'],
      sourceId: 'SRC-AASM2023',
      sourceTitle:
        'Clinical Practice Guideline for the Pharmacologic and Behavioral Treatment of Insomnia',
      organization: 'American Academy of Sleep Medicine',
      documentIdentifier: 'DOC-AASM-SLEEP-2023',
      chunkIdentifier: 'CHK-SLP-002',
      content:
        'Cognitive behavioral therapy for insomnia (CBT-I) and consistent sleep hygiene—including screen reduction 60 minutes before bed and regular wake times—are first-line recommendations for adult sleep improvement.',
      relevance: 0.91,
    },
    {
      keywords: ['stress', 'anxiety', 'mindfulness', 'burnout'],
      sourceId: 'SRC-WHO2023',
      sourceTitle: 'Mental Health and Stress Management in Primary Care',
      organization: 'World Health Organization',
      documentIdentifier: 'DOC-WHO-STRESS-2023',
      chunkIdentifier: 'CHK-STR-003',
      content:
        'Diaphragmatic breathing, structured micro-breaks, and progressive muscle relaxation provide evidence-based acute reduction in sympathetic nervous system activation.',
      relevance: 0.89,
    },
    {
      keywords: ['diabetes', 'glucose', 'sugar', 'a1c'],
      sourceId: 'SRC-ADA2025',
      sourceTitle: 'Standards of Care in Diabetes—2025',
      organization: 'American Diabetes Association',
      documentIdentifier: 'DOC-ADA-DIAB-2025',
      chunkIdentifier: 'CHK-DIB-004',
      content:
        'Lifestyle management through Mediterranean or DASH dietary patterns, 150 minutes of weekly moderate aerobic activity, and glycemic self-monitoring are foundational for non-clinical health tracking.',
      relevance: 0.92,
    },
    {
      keywords: ['hydration', 'water', 'dehydration'],
      sourceId: 'SRC-CDC2024',
      sourceTitle: 'Healthy Water Habits and Daily Fluid Intake Guidance',
      organization: 'Centers for Disease Control and Prevention',
      documentIdentifier: 'DOC-CDC-HYD-2024',
      chunkIdentifier: 'CHK-HYD-005',
      content:
        'Daily fluid requirements vary by climate and activity level; general adult guidelines advise 2.5 to 3.5 liters daily from all dietary sources for optimal metabolic support.',
      relevance: 0.85,
    },
  ];

  public async retrieve(query: string, limit: number = 3): Promise<MedicalRetrievalResult> {
    const lower = query.toLowerCase();
    const matchedChunks: MedicalEvidenceChunk[] = [];

    for (const doc of this.syntheticKnowledgeBase) {
      if (doc.keywords.some((k) => lower.includes(k))) {
        matchedChunks.push({
          sourceId: doc.sourceId,
          sourceTitle: doc.sourceTitle,
          organization: doc.organization,
          documentIdentifier: doc.documentIdentifier,
          chunkIdentifier: doc.chunkIdentifier,
          content: doc.content,
          relevance: doc.relevance,
          trustStatus: 'SYNTHETIC_MOCK',
        });
      }
    }

    const limited = matchedChunks.slice(0, limit);
    return {
      query,
      chunks: limited,
      medicalContextUsed: limited.length > 0,
      totalRetrieved: limited.length,
    };
  }
}

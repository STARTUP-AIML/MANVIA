import { Inject, Injectable } from '@nestjs/common';
import { MEDICAL_RETRIEVER } from '../providers/provider.tokens.js';
import {
  type MedicalRetriever,
  type MedicalRetrievalResult,
} from './medical-retriever.interface.js';
import { CitationService, type CitationItem } from './citation.service.js';

export interface MedicalRAGResult {
  medicalContextUsed: boolean;
  citations: CitationItem[];
  evidenceContext: string;
}

@Injectable()
export class MedicalRAGService {
  constructor(
    @Inject(MEDICAL_RETRIEVER)
    private readonly retriever: MedicalRetriever,
    private readonly citationService: CitationService,
  ) {}

  public async retrieveEvidence(query: string): Promise<MedicalRAGResult> {
    const retrieval: MedicalRetrievalResult = await this.retriever.retrieve(query);

    if (!retrieval.medicalContextUsed || retrieval.chunks.length === 0) {
      return {
        medicalContextUsed: false,
        citations: [],
        evidenceContext: '',
      };
    }

    const citations = this.citationService.buildCitations(retrieval.chunks);
    const evidenceContext = this.citationService.formatEvidenceContext(retrieval.chunks);

    return {
      medicalContextUsed: true,
      citations,
      evidenceContext,
    };
  }
}

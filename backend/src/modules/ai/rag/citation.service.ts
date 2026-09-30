import { Injectable } from '@nestjs/common';
import { type MedicalEvidenceChunk } from './medical-retriever.interface.js';

export interface CitationItem {
  sourceId: string;
  title: string;
  organization: string;
  documentId: string;
  relevance: number;
  snippet: string;
}

@Injectable()
export class CitationService {
  public buildCitations(chunks: MedicalEvidenceChunk[]): CitationItem[] {
    return chunks.map((chunk) => ({
      sourceId: chunk.sourceId,
      title: chunk.sourceTitle,
      organization: chunk.organization,
      documentId: chunk.documentIdentifier,
      relevance: Math.round(chunk.relevance * 100) / 100,
      snippet: chunk.content,
    }));
  }

  public formatEvidenceContext(chunks: MedicalEvidenceChunk[]): string {
    if (chunks.length === 0) return '';
    return chunks
      .map(
        (c, idx) =>
          `[Evidence ${idx + 1}] Source: ${c.sourceTitle} (${c.organization}): "${c.content}"`,
      )
      .join('\n');
  }
}

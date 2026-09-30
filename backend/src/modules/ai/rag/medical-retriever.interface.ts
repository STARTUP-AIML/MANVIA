export interface MedicalEvidenceChunk {
  sourceId: string;
  sourceTitle: string;
  organization: string;
  documentIdentifier: string;
  chunkIdentifier: string;
  content: string;
  relevance: number;
  trustStatus: string;
}

export interface MedicalRetrievalResult {
  query: string;
  chunks: MedicalEvidenceChunk[];
  medicalContextUsed: boolean;
  totalRetrieved: number;
}

export interface MedicalRetriever {
  retrieve(query: string, limit?: number | undefined): Promise<MedicalRetrievalResult>;
}

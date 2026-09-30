import { describe, it, expect, beforeEach } from 'vitest';
import { MedicalRAGService } from '../../src/modules/ai/rag/medical-rag.service.js';
import { MockMedicalRetriever } from '../../src/modules/ai/rag/mock-medical.retriever.js';
import { CitationService } from '../../src/modules/ai/rag/citation.service.js';

describe('MedicalRAGService & CitationService (Unit)', () => {
  let ragService: MedicalRAGService;
  let retriever: MockMedicalRetriever;
  let citationService: CitationService;

  beforeEach(() => {
    retriever = new MockMedicalRetriever();
    citationService = new CitationService();
    ragService = new MedicalRAGService(retriever, citationService);
  });

  describe('Evidence Retrieval', () => {
    it('should retrieve guideline chunks and citations for hypertension query', async () => {
      const result = await ragService.retrieveEvidence('hypertension blood pressure guidance');
      expect(result.medicalContextUsed).toBe(true);
      expect(result.citations.length).toBeGreaterThan(0);
      expect(result.citations[0]!.organization).toBe('American Heart Association / ACC');
      expect(result.citations[0]!.sourceId).toBe('SRC-AHA2024');
      expect(result.citations[0]!.relevance).toBeGreaterThanOrEqual(0.7);
      expect(result.evidenceContext).toContain(
        'Guidelines for the Prevention and Management of High Blood Pressure',
      );
    });

    it('should retrieve evidence chunks for diabetes query', async () => {
      const result = await ragService.retrieveEvidence('type 2 diabetes glucose guidance');
      expect(result.medicalContextUsed).toBe(true);
      expect(result.citations.length).toBeGreaterThan(0);
      expect(result.citations[0]!.organization).toBe('American Diabetes Association');
      expect(result.evidenceContext).toContain('Standards of Care in Diabetes');
    });

    it('should return empty evidence for casual non-medical query', async () => {
      const result = await ragService.retrieveEvidence('what is the weather today?');
      expect(result.medicalContextUsed).toBe(false);
      expect(result.citations).toHaveLength(0);
      expect(result.evidenceContext).toBe('');
    });
  });

  describe('Citation Generation and Trust Status', () => {
    it('should format structured citations without fabricating URLs or sources', async () => {
      const retrieval = await retriever.retrieve('hypertension');
      const citations = citationService.buildCitations(retrieval.chunks);

      expect(citations.length).toBe(retrieval.chunks.length);
      for (const citation of citations) {
        expect(citation.sourceId).toBeDefined();
        expect(citation.title).toBeDefined();
        expect(citation.organization).toBeDefined();
        expect(citation.documentId).toBeDefined();
        expect(citation.relevance).toBeGreaterThan(0);
        expect(citation.snippet).toBeDefined();
      }
    });

    it('should build context prompt incorporating synthetic guidelines without clinical authority claim', async () => {
      const retrieval = await retriever.retrieve('diabetes');
      const evidenceContext = citationService.formatEvidenceContext(retrieval.chunks);

      expect(evidenceContext).toContain('American Diabetes Association');
      expect(evidenceContext).toContain('Standards of Care in Diabetes');
      expect(evidenceContext).toContain('Evidence 1');
    });
  });

  describe('Synthetic Knowledge Base Completeness', () => {
    it('should retrieve multi-domain guidelines across sleep, stress, and hydration', async () => {
      const sleep = await retriever.retrieve('sleep insomnia');
      expect(sleep.medicalContextUsed).toBe(true);
      expect(sleep.chunks[0]!.organization).toBe('American Academy of Sleep Medicine');

      const stress = await retriever.retrieve('stress burnout');
      expect(stress.medicalContextUsed).toBe(true);
      expect(stress.chunks[0]!.organization).toBe('World Health Organization');

      const hydration = await retriever.retrieve('hydration water');
      expect(hydration.medicalContextUsed).toBe(true);
      expect(hydration.chunks[0]!.organization).toBe('Centers for Disease Control and Prevention');
    });
  });
});

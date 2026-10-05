import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import { ConfigService } from '../../../config/config.service.js';
import type {
  MedicalEvidenceChunk,
  MedicalRetrievalResult,
  MedicalRetriever,
} from './medical-retriever.interface.js';

interface RawChunkWithRelations {
  id: string;
  chunkIdentifier: string;
  content: string;
  keywords: string[];
  relevanceScore: number | null;
  document: {
    id: string;
    documentIdentifier: string;
    title: string;
    source: {
      id: string;
      publicSourceId: string;
      title: string;
      organization: string;
      trustStatus: string;
      isActive: boolean;
    };
  };
}

@Injectable()
export class PrismaMedicalRetriever implements MedicalRetriever {
  private readonly logger = new Logger(PrismaMedicalRetriever.name);

  constructor(
    @Optional()
    @Inject(PrismaService)
    private readonly prisma?: PrismaService,
    @Optional()
    @Inject(ConfigService)
    private readonly configService?: ConfigService,
  ) {}

  public async retrieve(query: string, limit?: number): Promise<MedicalRetrievalResult> {
    const isRagEnabled = this.configService?.isRagEnabled ?? true;
    if (!isRagEnabled) {
      return {
        query,
        chunks: [],
        medicalContextUsed: false,
        totalRetrieved: 0,
      };
    }

    if (!this.prisma) {
      this.logger.warn('PrismaService unavailable in PrismaMedicalRetriever');
      return {
        query,
        chunks: [],
        medicalContextUsed: false,
        totalRetrieved: 0,
      };
    }

    const maxResults = limit ?? this.configService?.ragTopK ?? 5;
    const minRelevance = this.configService?.ragMinRelevance ?? 0.7;

    const queryTokens = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 3);

    if (queryTokens.length === 0) {
      return {
        query,
        chunks: [],
        medicalContextUsed: false,
        totalRetrieved: 0,
      };
    }

    try {
      // Find active verified documents from official health authority sources
      const rawChunks = (await this.prisma.aIMedicalChunk.findMany({
        where: {
          document: {
            source: {
              isActive: true,
              trustStatus: {
                in: ['OFFICIAL_HEALTH_AUTHORITY', 'VERIFIED'],
              },
            },
          },
        },
        include: {
          document: {
            include: {
              source: true,
            },
          },
        },
      })) as unknown as RawChunkWithRelations[];

      const scoredChunks: Array<{ chunk: RawChunkWithRelations; score: number }> = [];

      for (const raw of rawChunks) {
        let score = 0;
        const contentLower = raw.content.toLowerCase();
        const keywordsLower = (raw.keywords || []).map((k) => k.toLowerCase());

        for (const token of queryTokens) {
          // Keyword match carries highest weight
          if (keywordsLower.some((k) => k.includes(token) || token.includes(k))) {
            score += 0.35;
          }
          // Content occurrence carries secondary weight
          if (contentLower.includes(token)) {
            score += 0.2;
          }
        }

        if (raw.relevanceScore) {
          score = Math.max(score, raw.relevanceScore);
        }

        // Normalize between minRelevance and 0.98 if matched
        if (score > 0) {
          const normalized = Math.min(
            0.98,
            Math.max(minRelevance, Math.round((0.7 + Math.min(score, 0.28)) * 100) / 100),
          );
          scoredChunks.push({ chunk: raw, score: normalized });
        }
      }

      // Sort descending by score
      scoredChunks.sort((a, b) => b.score - a.score);
      const topMatches = scoredChunks.slice(0, maxResults);

      const chunks: MedicalEvidenceChunk[] = topMatches.map(({ chunk, score }) => ({
        sourceId: chunk.document.source.publicSourceId,
        sourceTitle: chunk.document.source.title,
        organization: chunk.document.source.organization,
        documentIdentifier: chunk.document.documentIdentifier,
        chunkIdentifier: chunk.chunkIdentifier,
        content: chunk.content,
        relevance: score,
        trustStatus: chunk.document.source.trustStatus,
      }));

      return {
        query,
        chunks,
        medicalContextUsed: chunks.length > 0,
        totalRetrieved: chunks.length,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to retrieve medical evidence from database: ${msg}`);
      return {
        query,
        chunks: [],
        medicalContextUsed: false,
        totalRetrieved: 0,
      };
    }
  }
}

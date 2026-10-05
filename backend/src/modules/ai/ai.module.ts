import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { PrismaService } from '../../database/prisma.service.js';
import { ConfigService } from '../../config/config.service.js';
import { DoctorsModule } from '../doctors/doctors.module.js';
import { AICompanionController } from './controllers/ai-companion.controller.js';
import { AICompanionService } from './services/ai-companion.service.js';
import { AIOrchestratorService } from './services/ai-orchestrator.service.js';
import { AIContextService } from './services/ai-context.service.js';
import { AIAuditService } from './services/ai-audit.service.js';
import { MockAIProvider } from './providers/mock-ai.provider.js';
import { GeminiAIProvider } from './providers/gemini-ai.provider.js';
import { InMemoryAIRepository } from './repositories/in-memory-ai.repository.js';
import { PrismaAIRepository } from './repositories/prisma-ai.repository.js';
import {
  AI_AUDIT_SERVICE,
  AI_CONVERSATION_REPOSITORY,
  AI_FEEDBACK_REPOSITORY,
  AI_MESSAGE_REPOSITORY,
  AI_PROVIDER,
  AI_REPOSITORY,
  SAFETY_CLASSIFIER,
  MEDICAL_RETRIEVER,
  REALTIME_AI_PROVIDER,
} from './providers/provider.tokens.js';
import { AISafetyService } from './safety/ai-safety.service.js';
import { MockSafetyClassifier } from './safety/mock-safety.classifier.js';
import { LayeredSafetyClassifier } from './safety/layered-safety.classifier.js';
import { MedicalRAGService } from './rag/medical-rag.service.js';
import { CitationService } from './rag/citation.service.js';
import { MockMedicalRetriever } from './rag/mock-medical.retriever.js';
import { PrismaMedicalRetriever } from './rag/prisma-medical.retriever.js';
import { AIMemoryService } from './memory/ai-memory.service.js';
import { AIRealtimeService } from './realtime/ai-realtime.service.js';
import { MockRealtimeProvider } from './realtime/mock-realtime.provider.js';
import { GeminiRealtimeProvider } from './realtime/gemini-realtime.provider.js';
import { AuthModule } from '../auth/auth.module.js';
import { AIVoiceGateway } from './realtime/ai-voice.gateway.js';
import { AIHandoffService } from './handoff/ai-handoff.service.js';

@Module({
  imports: [DatabaseModule, DoctorsModule, AuthModule],
  controllers: [AICompanionController],
  providers: [
    AICompanionService,
    AIOrchestratorService,
    AIContextService,
    AIAuditService,
    AIVoiceGateway,
    // Real and Mock Provider Implementations
    MockAIProvider,
    GeminiAIProvider,
    InMemoryAIRepository,
    PrismaAIRepository,
    // Safety Services & Classifiers
    AISafetyService,
    MockSafetyClassifier,
    LayeredSafetyClassifier,
    // Medical RAG Services & Retrievers
    MedicalRAGService,
    CitationService,
    MockMedicalRetriever,
    PrismaMedicalRetriever,
    // Memory
    AIMemoryService,
    // Realtime Services & Providers
    AIRealtimeService,
    MockRealtimeProvider,
    GeminiRealtimeProvider,
    // Human Clinician Handoff
    AIHandoffService,

    // Runtime DI Token Bindings with Real Provider Defaults & Test Fallbacks
    {
      provide: AI_PROVIDER,
      useFactory: (config: ConfigService, gemini: GeminiAIProvider, mock: MockAIProvider) => {
        const providerName = (config.aiProvider || '').toLowerCase();
        const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
        // Test default: MOCK PROVIDER (unless explicitly requested via AI_USE_REAL_PROVIDER=true)
        if (isTest && process.env.AI_USE_REAL_PROVIDER !== 'true') {
          return mock;
        }
        if (providerName === 'mock') {
          return mock;
        }
        return gemini;
      },
      inject: [ConfigService, GeminiAIProvider, MockAIProvider],
    },
    {
      provide: AI_REPOSITORY,
      useFactory: (
        _prismaService: PrismaService,
        prismaRepo: PrismaAIRepository,
        inMemoryRepo: InMemoryAIRepository,
      ) => {
        const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
        if (isTest && process.env.AI_USE_REAL_REPO !== 'true') {
          return inMemoryRepo;
        }
        return prismaRepo;
      },
      inject: [PrismaService, PrismaAIRepository, InMemoryAIRepository],
    },
    {
      provide: AI_CONVERSATION_REPOSITORY,
      useExisting: AI_REPOSITORY,
    },
    {
      provide: AI_MESSAGE_REPOSITORY,
      useExisting: AI_REPOSITORY,
    },
    {
      provide: AI_FEEDBACK_REPOSITORY,
      useExisting: AI_REPOSITORY,
    },
    {
      provide: AI_AUDIT_SERVICE,
      useClass: AIAuditService,
    },
    {
      provide: SAFETY_CLASSIFIER,
      useFactory: (
        _config: ConfigService,
        layered: LayeredSafetyClassifier,
        mock: MockSafetyClassifier,
      ) => {
        const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
        if (isTest && process.env.AI_USE_REAL_SAFETY !== 'true') {
          return mock;
        }
        return layered;
      },
      inject: [ConfigService, LayeredSafetyClassifier, MockSafetyClassifier],
    },
    {
      provide: MEDICAL_RETRIEVER,
      useFactory: (
        _config: ConfigService,
        prismaRetriever: PrismaMedicalRetriever,
        mockRetriever: MockMedicalRetriever,
      ) => {
        const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
        if (isTest && process.env.AI_USE_REAL_RETRIEVER !== 'true') {
          return mockRetriever;
        }
        return prismaRetriever;
      },
      inject: [ConfigService, PrismaMedicalRetriever, MockMedicalRetriever],
    },
    {
      provide: REALTIME_AI_PROVIDER,
      useFactory: (
        config: ConfigService,
        geminiRealtime: GeminiRealtimeProvider,
        mockRealtime: MockRealtimeProvider,
      ) => {
        const providerName = (config.realtimeProvider || '').toLowerCase();
        const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
        // Test default: MOCK PROVIDER (unless explicitly requested via AI_USE_REAL_REALTIME=true)
        if (isTest && process.env.AI_USE_REAL_REALTIME !== 'true') {
          return mockRealtime;
        }
        if (providerName === 'mock') {
          return mockRealtime;
        }
        return geminiRealtime;
      },
      inject: [ConfigService, GeminiRealtimeProvider, MockRealtimeProvider],
    },
  ],
  exports: [
    AICompanionService,
    AIOrchestratorService,
    AIContextService,
    AISafetyService,
    MedicalRAGService,
    AIMemoryService,
    AIRealtimeService,
    AIVoiceGateway,
    AIHandoffService,
    AI_PROVIDER,
    AI_REPOSITORY,
    AI_AUDIT_SERVICE,
    SAFETY_CLASSIFIER,
    MEDICAL_RETRIEVER,
    REALTIME_AI_PROVIDER,
    InMemoryAIRepository,
    PrismaAIRepository,
    MockAIProvider,
    GeminiAIProvider,
    MockSafetyClassifier,
    LayeredSafetyClassifier,
    MockMedicalRetriever,
    PrismaMedicalRetriever,
    MockRealtimeProvider,
    GeminiRealtimeProvider,
  ],
})
export class AIModule {}

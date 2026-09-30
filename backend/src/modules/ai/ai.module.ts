import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { DoctorsModule } from '../doctors/doctors.module.js';
import { AICompanionController } from './controllers/ai-companion.controller.js';
import { AICompanionService } from './services/ai-companion.service.js';
import { AIOrchestratorService } from './services/ai-orchestrator.service.js';
import { AIContextService } from './services/ai-context.service.js';
import { AIAuditService } from './services/ai-audit.service.js';
import { MockAIProvider } from './providers/mock-ai.provider.js';
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
import { MedicalRAGService } from './rag/medical-rag.service.js';
import { CitationService } from './rag/citation.service.js';
import { MockMedicalRetriever } from './rag/mock-medical.retriever.js';
import { AIMemoryService } from './memory/ai-memory.service.js';
import { AIRealtimeService } from './realtime/ai-realtime.service.js';
import { MockRealtimeProvider } from './realtime/mock-realtime.provider.js';
import { AIHandoffService } from './handoff/ai-handoff.service.js';

@Module({
  imports: [DatabaseModule, DoctorsModule],
  controllers: [AICompanionController],
  providers: [
    AICompanionService,
    AIOrchestratorService,
    AIContextService,
    AIAuditService,
    MockAIProvider,
    InMemoryAIRepository,
    PrismaAIRepository,
    // Phase 16 Services & Classifiers
    AISafetyService,
    MockSafetyClassifier,
    MedicalRAGService,
    CitationService,
    MockMedicalRetriever,
    AIMemoryService,
    // Phase 17 Services & Realtime Providers
    AIRealtimeService,
    MockRealtimeProvider,
    AIHandoffService,
    {
      provide: AI_PROVIDER,
      useClass: MockAIProvider,
    },
    {
      provide: AI_REPOSITORY,
      useClass: InMemoryAIRepository,
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
      useClass: MockSafetyClassifier,
    },
    {
      provide: MEDICAL_RETRIEVER,
      useClass: MockMedicalRetriever,
    },
    {
      provide: REALTIME_AI_PROVIDER,
      useClass: MockRealtimeProvider,
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
    AIHandoffService,
    AI_PROVIDER,
    AI_REPOSITORY,
    AI_AUDIT_SERVICE,
    SAFETY_CLASSIFIER,
    MEDICAL_RETRIEVER,
    REALTIME_AI_PROVIDER,
    InMemoryAIRepository,
    PrismaAIRepository,
  ],
})
export class AIModule {}

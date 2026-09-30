import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIRealtimeService } from '../../src/modules/ai/realtime/ai-realtime.service.js';
import { MockRealtimeProvider } from '../../src/modules/ai/realtime/mock-realtime.provider.js';
import { RealtimeStateMachine } from '../../src/modules/ai/realtime/realtime-state-machine.js';
import { AIRealtimeState } from '../../src/modules/ai/realtime/realtime.enums.js';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../src/common/errors/app-error.js';

import type { PrismaService } from '../../src/database/prisma.service.js';
import type { AIAuditService } from '../../src/modules/ai/services/ai-audit.service.js';

interface MockPrismaRealtime {
  aIRealtimeSession: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
}

describe('AIRealtimeService & State Machine (Unit)', () => {
  let realtimeService: AIRealtimeService;
  let mockProvider: MockRealtimeProvider;
  let mockPrisma: MockPrismaRealtime;
  let mockAudit: { logEvent: ReturnType<typeof vi.fn> };

  const USER_A = 'a0000000-0000-0000-0000-000000000001';
  const USER_B = 'b0000000-0000-0000-0000-000000000002';
  const SESSION_ID = 'RTS-TEST1234';

  beforeEach(() => {
    mockProvider = new MockRealtimeProvider();
    mockPrisma = {
      aIRealtimeSession: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
    };
    mockAudit = {
      logEvent: vi.fn(),
    };

    realtimeService = new AIRealtimeService(
      mockProvider,
      mockPrisma as unknown as PrismaService,
      mockAudit as unknown as AIAuditService,
    );
  });

  describe('Realtime State Machine', () => {
    it('should validate legal sequential transitions', () => {
      expect(
        RealtimeStateMachine.isValidTransition(AIRealtimeState.IDLE, AIRealtimeState.LISTENING),
      ).toBe(true);
      expect(
        RealtimeStateMachine.isValidTransition(
          AIRealtimeState.LISTENING,
          AIRealtimeState.PROCESSING,
        ),
      ).toBe(true);
      expect(
        RealtimeStateMachine.isValidTransition(
          AIRealtimeState.PROCESSING,
          AIRealtimeState.SPEAKING,
        ),
      ).toBe(true);
      expect(
        RealtimeStateMachine.isValidTransition(
          AIRealtimeState.SPEAKING,
          AIRealtimeState.INTERRUPTED,
        ),
      ).toBe(true);
      expect(
        RealtimeStateMachine.isValidTransition(
          AIRealtimeState.INTERRUPTED,
          AIRealtimeState.LISTENING,
        ),
      ).toBe(true);
    });

    it('should throw ValidationError on illegal transitions', () => {
      expect(() =>
        RealtimeStateMachine.validateTransition(AIRealtimeState.IDLE, AIRealtimeState.SPEAKING),
      ).toThrow(ValidationError);
    });

    it('should allow transition to ENDED or ERROR from active states', () => {
      expect(
        RealtimeStateMachine.isValidTransition(AIRealtimeState.LISTENING, AIRealtimeState.ENDED),
      ).toBe(true);
      expect(
        RealtimeStateMachine.isValidTransition(AIRealtimeState.SPEAKING, AIRealtimeState.ERROR),
      ).toBe(true);
    });
  });

  describe('Realtime Session Lifecycle', () => {
    it('should create realtime session with ephemeral connection credentials and isolated secret', async () => {
      mockPrisma.aIRealtimeSession.create.mockResolvedValue({
        id: 'rts-db-1',
        publicSessionId: SESSION_ID,
        userId: USER_A,
        provider: 'MOCK_REALTIME_PROVIDER',
        model: 'realtime-companion-v1',
        state: AIRealtimeState.IDLE,
        interruptionCount: 0,
        connectionInfo: {
          websocketUrl: 'ws://mock-realtime.test/v1/stream',
          ephemeralToken: 'mock-live-token',
        },
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const session = await realtimeService.createSession(USER_A, {
        modalities: ['AUDIO', 'TEXT'],
        locale: 'en-US',
      });

      expect(session.publicSessionId).toBe(SESSION_ID);
      expect(session.state).toBe(AIRealtimeState.IDLE);
      expect(session.connectionInfo?.endpoint).toBeDefined();
      expect(session.connectionInfo?.clientSessionToken).toBeDefined();
      expect(session.connectionInfo?.transport).toBe('websocket');
      expect(mockAudit.logEvent).toHaveBeenCalled();
    });

    it('should record barge-in interruption and return cancellation latency', async () => {
      mockPrisma.aIRealtimeSession.findFirst.mockResolvedValue({
        id: 'rts-db-1',
        publicSessionId: SESSION_ID,
        userId: USER_A,
        state: AIRealtimeState.SPEAKING,
        interruptionCount: 0,
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.aIRealtimeSession.update.mockResolvedValue({
        id: 'rts-db-1',
        publicSessionId: SESSION_ID,
        state: AIRealtimeState.INTERRUPTED,
      });

      const result = await realtimeService.interruptSession(USER_A, SESSION_ID);

      expect(result.interrupted).toBe(true);
      expect(result.latencyMs).toBeGreaterThanOrEqual(1);
      expect(mockAudit.logEvent).toHaveBeenCalled();
    });

    it('should terminate realtime session cleanly', async () => {
      mockPrisma.aIRealtimeSession.findFirst.mockResolvedValue({
        id: 'rts-db-1',
        publicSessionId: SESSION_ID,
        userId: USER_A,
        state: AIRealtimeState.LISTENING,
        expiresAt: new Date(Date.now() + 3600000),
        interruptionCount: 1,
        connectionInfo: {},
        createdAt: new Date(Date.now() - 5000),
        updatedAt: new Date(),
      });
      mockPrisma.aIRealtimeSession.update.mockResolvedValue({
        id: 'rts-db-1',
        publicSessionId: SESSION_ID,
        userId: USER_A,
        state: AIRealtimeState.ENDED,
        expiresAt: new Date(Date.now() + 3600000),
        interruptionCount: 1,
        connectionInfo: {},
        createdAt: new Date(Date.now() - 5000),
        updatedAt: new Date(),
      });

      const res = await realtimeService.endSession(USER_A, SESSION_ID);
      expect(res.success).toBe(true);
      expect(res.id).toBe(SESSION_ID);
      expect(mockAudit.logEvent).toHaveBeenCalled();
    });
  });

  describe('Realtime Session Cross-User Security', () => {
    it('should forbid User B from querying or modifying User A realtime session', async () => {
      mockPrisma.aIRealtimeSession.findFirst.mockResolvedValue({
        id: 'rts-db-1',
        publicSessionId: SESSION_ID,
        userId: USER_A,
        state: AIRealtimeState.SPEAKING,
        expiresAt: new Date(Date.now() + 3600000),
      });

      await expect(realtimeService.interruptSession(USER_B, SESSION_ID)).rejects.toThrow(
        ForbiddenError,
      );
      await expect(realtimeService.endSession(USER_B, SESSION_ID)).rejects.toThrow(ForbiddenError);
      await expect(realtimeService.getSession(USER_B, SESSION_ID)).rejects.toThrow(ForbiddenError);
    });

    it('should throw NotFoundError if realtime session does not exist', async () => {
      mockPrisma.aIRealtimeSession.findFirst.mockResolvedValue(null);

      await expect(realtimeService.getSession(USER_A, 'RTS-NONEXISTENT')).rejects.toThrow(
        NotFoundError,
      );
    });
  });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApp } from '../../src/main.js';
import { PrismaService } from '../../src/database/prisma.service.js';

describe('AI Medical RAG, Safety, Memory, Realtime & Handoff (E2E)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  const PATIENT_A = '11111111-1111-4111-8111-111111111111';
  const PATIENT_B = '22222222-2222-4222-8222-222222222222';
  const DOCTOR_USER_ID = '33333333-3333-4333-8333-333333333333';

  let memoryId: string;
  let realtimeSessionId: string;
  let handoffId: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    app = await createApp();
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    prisma = app.get(PrismaService);

    // Seed test users & doctor profiles if not present
    await prisma.user.upsert({
      where: { id: PATIENT_A },
      update: {},
      create: {
        id: PATIENT_A,
        email: 'patient_a_advanced@manvia.test',
        roles: ['PATIENT'],
      },
    });

    await prisma.user.upsert({
      where: { id: PATIENT_B },
      update: {},
      create: {
        id: PATIENT_B,
        email: 'patient_b_advanced@manvia.test',
        roles: ['PATIENT'],
      },
    });

    await prisma.user.upsert({
      where: { id: DOCTOR_USER_ID },
      update: {},
      create: {
        id: DOCTOR_USER_ID,
        email: 'doctor_verified_advanced@manvia.test',
        roles: ['DOCTOR'],
      },
    });

    await prisma.doctorProfile.upsert({
      where: { userId: DOCTOR_USER_ID },
      update: { verificationStatus: 'VERIFIED' },
      create: {
        userId: DOCTOR_USER_ID,
        publicDoctorId: 'DOC-ADV01',
        displayName: 'Dr. Test Clinician',
        medicalRegistrationNumber: 'REG-ADV-001',
        licensingCouncil: 'General Medical Council',
        yearsOfExperience: 10,
        verificationStatus: 'VERIFIED',
      },
    });
  });

  afterAll(async () => {
    // Clean up created resources in reverse dependency order
    try {
      await prisma.aIHumanHandoff.deleteMany({ where: { userId: { in: [PATIENT_A, PATIENT_B] } } });
      await prisma.aIRealtimeSession.deleteMany({
        where: { userId: { in: [PATIENT_A, PATIENT_B] } },
      });
      await prisma.aIMemory.deleteMany({ where: { userId: { in: [PATIENT_A, PATIENT_B] } } });
      await prisma.aISafetyEvent.deleteMany({ where: { userId: { in: [PATIENT_A, PATIENT_B] } } });
      await prisma.doctorProfile.deleteMany({ where: { userId: DOCTOR_USER_ID } });
      await prisma.user.deleteMany({
        where: { id: { in: [PATIENT_A, PATIENT_B, DOCTOR_USER_ID] } },
      });
    } catch {
      // Ignore cleanup error
    }
    await app.close();
  });

  // ==========================================
  // 1. SAFETY EVALUATION API
  // ==========================================
  describe('Safety Evaluation API (/api/v1/ai/safety/evaluate)', () => {
    it('should classify safe wellness query as SAFE', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/safety/check',
        headers: { 'x-user-id': PATIENT_A, 'x-user-role': 'PATIENT' },
        payload: { text: 'What is a good evening wind-down routine?' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.classification).toBe('SAFE');
      expect(body.action).toBe('ALLOWED');
      expect(body.escalationRequired).toBe(false);
    });

    it('should classify acute chest pain query as EMERGENCY and require escalation', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/safety/check',
        headers: { 'x-user-id': PATIENT_A, 'x-user-role': 'PATIENT' },
        payload: { text: 'I am experiencing crushing chest pain and cant breathe' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.classification).toBe('EMERGENCY');
      expect(body.action).toBe('EMERGENCY_ESCALATION');
      expect(body.escalationRequired).toBe(true);
      expect(body.advisoryMessage).toBeDefined();
    });

    it('should classify self-harm query as SELF_HARM_OR_SUICIDE and require crisis referral', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/safety/check',
        headers: { 'x-user-id': PATIENT_A, 'x-user-role': 'PATIENT' },
        payload: { text: 'I feel overwhelmed and want to kill myself' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.classification).toBe('SELF_HARM_OR_SUICIDE');
      expect(body.action).toBe('CRISIS_REFERRAL');
      expect(body.escalationRequired).toBe(true);
    });
  });

  // ==========================================
  // 2. MEDICAL RAG API
  // ==========================================
  describe('Medical RAG API (/api/v1/ai/rag/retrieve)', () => {
    it('should retrieve clinical guidelines and formatted citations for medical terms', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/rag/retrieve',
        headers: { 'x-user-id': PATIENT_A, 'x-user-role': 'PATIENT' },
        payload: { query: 'hypertension blood pressure guidance' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.medicalContextUsed).toBe(true);
      expect(body.citations.length).toBeGreaterThan(0);
      expect(body.citations[0].organization).toContain('American Heart Association');
      expect(body.evidenceContext).toContain(
        'Guidelines for the Prevention and Management of High Blood Pressure',
      );
    });

    it('should return empty evidence for casual queries', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/rag/retrieve',
        headers: { 'x-user-id': PATIENT_A, 'x-user-role': 'PATIENT' },
        payload: { query: 'Tell me a good morning greeting' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.medicalContextUsed).toBe(false);
      expect(body.citations).toHaveLength(0);
    });
  });

  // ==========================================
  // 3. AI CONVERSATION WITH MEDICAL RAG CITATIONS
  // ==========================================
  describe('AI Conversation with RAG Citations Integration', () => {
    let conversationId: string;

    it('should create conversation and attach structured citations for medical questions', async () => {
      const convRes = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/conversations',
        headers: { 'x-user-id': PATIENT_A, 'x-user-role': 'PATIENT' },
        payload: { title: 'Health Habits' },
      });
      expect(convRes.statusCode).toBe(201);
      const conv = JSON.parse(convRes.body);
      conversationId = conv.id;

      const msgRes = await app.inject({
        method: 'POST',
        url: `/api/v1/ai/conversations/${conversationId}/messages`,
        headers: { 'x-user-id': PATIENT_A, 'x-user-role': 'PATIENT' },
        payload: { content: 'What is the guideline for blood pressure management?' },
      });

      expect(msgRes.statusCode).toBe(200);
      const msgBody = JSON.parse(msgRes.body);
      expect(msgBody.assistantMessage).toBeDefined();
      expect(msgBody.assistantMessage.isAiGenerated).toBe(true);
      expect(msgBody.medicalContextUsed).toBe(true);
      expect(Array.isArray(msgBody.citations)).toBe(true);
      expect(msgBody.citations.length).toBeGreaterThan(0);
      expect(msgBody.citations[0].organization).toBeDefined();
    });
  });

  // ==========================================
  // 4. AI MEMORY LIFECYCLE & SECURITY
  // ==========================================
  describe('AI Memory Lifecycle & Cross-User Security', () => {
    it('should create user-approved non-sensitive memory for Patient A', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/memories',
        headers: { 'x-user-id': PATIENT_A, 'x-user-role': 'PATIENT' },
        payload: {
          category: 'PREFERENCE',
          key: 'wake_up_time',
          value: '6:30 AM',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.publicMemoryId).toMatch(/^MEM-[2-9A-Z]{8}$/);
      expect(body.category).toBe('PREFERENCE');
      expect(body.key).toBe('wake_up_time');
      expect(body.value).toBe('6:30 AM');
      memoryId = body.publicMemoryId;
    });

    it('should list memories for Patient A', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/ai/memories',
        headers: { 'x-user-id': PATIENT_A, 'x-user-role': 'PATIENT' },
      });

      expect(res.statusCode).toBe(200);
      const list = JSON.parse(res.body);
      expect(list.length).toBeGreaterThanOrEqual(1);
      expect(list.some((m: { publicMemoryId: string }) => m.publicMemoryId === memoryId)).toBe(
        true,
      );
    });

    it('should NOT allow Patient B to see Patient A memories', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/ai/memories',
        headers: { 'x-user-id': PATIENT_B, 'x-user-role': 'PATIENT' },
      });

      expect(res.statusCode).toBe(200);
      const list = JSON.parse(res.body);
      expect(list.some((m: { publicMemoryId: string }) => m.publicMemoryId === memoryId)).toBe(
        false,
      );
    });

    it('should FORBID Patient B from deleting Patient A memory (403)', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/ai/memories/${memoryId}`,
        headers: { 'x-user-id': PATIENT_B, 'x-user-role': 'PATIENT' },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should allow Patient A to delete their own memory (200)', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/ai/memories/${memoryId}`,
        headers: { 'x-user-id': PATIENT_A, 'x-user-role': 'PATIENT' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
    });
  });

  // ==========================================
  // 5. REALTIME SESSION LIFECYCLE & SECURITY
  // ==========================================
  describe('AI Realtime Session Lifecycle & Barge-in Interruption', () => {
    it('should create realtime session with ephemeral credentials for Patient A', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/realtime/session',
        headers: { 'x-user-id': PATIENT_A, 'x-user-role': 'PATIENT' },
        payload: {
          modalities: ['AUDIO', 'TEXT'],
          locale: 'en-US',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.publicSessionId).toMatch(/^RTS-[2-9A-Z]{8}$/);
      expect(body.state).toBe('IDLE');
      expect(body.connectionInfo).toBeDefined();
      expect(body.connectionInfo.transport).toBe('websocket');
      expect(body.connectionInfo.clientSessionToken).toBeDefined();
      realtimeSessionId = body.publicSessionId;
    });

    it('should get session status for Patient A', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/ai/realtime/session/${realtimeSessionId}`,
        headers: { 'x-user-id': PATIENT_A, 'x-user-role': 'PATIENT' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.publicSessionId).toBe(realtimeSessionId);
    });

    it('should transition session state to LISTENING', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/ai/realtime/session/${realtimeSessionId}/transition`,
        headers: { 'x-user-id': PATIENT_A, 'x-user-role': 'PATIENT' },
        payload: { state: 'LISTENING' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.state).toBe('LISTENING');
    });

    it('should FORBID Patient B from transitioning or controlling Patient A session (403)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/ai/realtime/session/${realtimeSessionId}/transition`,
        headers: { 'x-user-id': PATIENT_B, 'x-user-role': 'PATIENT' },
        payload: { state: 'PROCESSING' },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should advance to PROCESSING then SPEAKING then support barge-in interruption', async () => {
      // Transition to PROCESSING
      await app.inject({
        method: 'POST',
        url: `/api/v1/ai/realtime/session/${realtimeSessionId}/transition`,
        headers: { 'x-user-id': PATIENT_A, 'x-user-role': 'PATIENT' },
        payload: { state: 'PROCESSING' },
      });

      // Transition to SPEAKING
      await app.inject({
        method: 'POST',
        url: `/api/v1/ai/realtime/session/${realtimeSessionId}/transition`,
        headers: { 'x-user-id': PATIENT_A, 'x-user-role': 'PATIENT' },
        payload: { state: 'SPEAKING' },
      });

      // Barge-in Interruption
      const intRes = await app.inject({
        method: 'POST',
        url: `/api/v1/ai/realtime/session/${realtimeSessionId}/interrupt`,
        headers: { 'x-user-id': PATIENT_A, 'x-user-role': 'PATIENT' },
      });

      expect(intRes.statusCode).toBe(200);
      const intBody = JSON.parse(intRes.body);
      expect(intBody.interrupted).toBe(true);
      expect(intBody.latencyMs).toBeGreaterThanOrEqual(1);

      // Verify state is now INTERRUPTED
      const checkRes = await app.inject({
        method: 'GET',
        url: `/api/v1/ai/realtime/session/${realtimeSessionId}`,
        headers: { 'x-user-id': PATIENT_A, 'x-user-role': 'PATIENT' },
      });
      expect(JSON.parse(checkRes.body).state).toBe('INTERRUPTED');
    });

    it('should cleanly terminate realtime session', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/ai/realtime/session/${realtimeSessionId}/end`,
        headers: { 'x-user-id': PATIENT_A, 'x-user-role': 'PATIENT' },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).success).toBe(true);
    });
  });

  // ==========================================
  // 6. CLINICIAN HANDOFF LIFECYCLE & PRIVACY
  // ==========================================
  describe('AI Clinician Handoff Lifecycle & Privacy Boundary', () => {
    it('should create human handoff request with explicit consent for Patient A', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/handoffs',
        headers: { 'x-user-id': PATIENT_A, 'x-user-role': 'PATIENT' },
        payload: {
          reason: 'Patient requests clinical consultation for recurring migraines',
          requestedUrgency: 'URGENT',
          consentGranted: true,
          userSummary: 'Frequent headaches over past two weeks',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.publicHandoffId).toMatch(/^AIH-[2-9A-Z]{8}$/);
      expect(body.status).toBe('REQUESTED');
      expect(body.consentGranted).toBe(true);
      handoffId = body.publicHandoffId;
    });

    it('should allow Patient A to view their own handoff requests', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/ai/handoffs',
        headers: { 'x-user-id': PATIENT_A, 'x-user-role': 'PATIENT' },
      });

      expect(res.statusCode).toBe(200);
      const list = JSON.parse(res.body);
      expect(list.some((h: { publicHandoffId: string }) => h.publicHandoffId === handoffId)).toBe(
        true,
      );
    });

    it('should FORBID Patient B from seeing Patient A handoff (403 on direct get)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/ai/handoffs/${handoffId}`,
        headers: { 'x-user-id': PATIENT_B, 'x-user-role': 'PATIENT' },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should FORBID patients from accessing doctor triage queue (403)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/ai/doctor/handoffs',
        headers: { 'x-user-id': PATIENT_A, 'x-user-role': 'PATIENT' },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should allow verified doctor to access doctor triage queue and see handoff', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/ai/doctor/handoffs',
        headers: { 'x-user-id': DOCTOR_USER_ID, 'x-user-role': 'DOCTOR' },
      });

      expect(res.statusCode).toBe(200);
      const queue = JSON.parse(res.body);
      expect(Array.isArray(queue)).toBe(true);
      expect(queue.some((h: { publicHandoffId: string }) => h.publicHandoffId === handoffId)).toBe(
        true,
      );
    });

    it('should allow verified doctor to accept the handoff', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/ai/doctor/handoffs/${handoffId}/accept`,
        headers: { 'x-user-id': DOCTOR_USER_ID, 'x-user-role': 'DOCTOR' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.status).toBe('ACCEPTED');
      expect(body.assignedDoctorId).toBeDefined();
    });

    it('should allow patient to cancel a newly created handoff', async () => {
      // Create new handoff to cancel
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/handoffs',
        headers: { 'x-user-id': PATIENT_A, 'x-user-role': 'PATIENT' },
        payload: {
          reason: 'Routine question about diet',
          requestedUrgency: 'ROUTINE',
          consentGranted: true,
        },
      });
      const newHandoff = JSON.parse(createRes.body);

      // Patient cancels it
      const cancelRes = await app.inject({
        method: 'POST',
        url: `/api/v1/ai/handoffs/${newHandoff.publicHandoffId}/cancel`,
        headers: { 'x-user-id': PATIENT_A, 'x-user-role': 'PATIENT' },
      });

      expect(cancelRes.statusCode).toBe(200);
      const cancelBody = JSON.parse(cancelRes.body);
      expect(cancelBody.status).toBe('CANCELLED');
    });
  });
});

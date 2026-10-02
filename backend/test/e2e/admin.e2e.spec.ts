import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApp } from '../../src/main.js';

describe('Admin Platform & Governance (E2E)', () => {
  let app: NestFastifyApplication;

  const adminHeaders = {
    'x-user-id': '00000000-0000-0000-0000-000000000001',
    'x-user-role': 'ADMIN',
  };

  const patientHeaders = {
    'x-user-id': '00000000-0000-0000-0000-000000000002',
    'x-user-role': 'PATIENT',
  };

  const doctorHeaders = {
    'x-user-id': '00000000-0000-0000-0000-000000000003',
    'x-user-role': 'DOCTOR',
  };

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    app = await createApp();
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Administrative Security Gate & Authorization', () => {
    it('GET /api/v1/admin/users should return 401 when unauthenticated', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/users',
      });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.statusCode).toBe(401);
    });

    it('GET /api/v1/admin/users should return 403 when called by PATIENT', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/users',
        headers: patientHeaders,
      });
      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.body);
      expect(body.statusCode).toBe(403);
    });

    it('GET /api/v1/admin/users should return 403 when called by DOCTOR', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/users',
        headers: doctorHeaders,
      });
      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.body);
      expect(body.statusCode).toBe(403);
    });

    it('GET /api/v1/admin/users should return 200 when called by ADMIN', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/users?page=1&limit=10',
        headers: adminHeaders,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.items).toBeDefined();
      expect(typeof body.total).toBe('number');
    });
  });

  describe('Admin Platform Oversight Endpoints', () => {
    it('GET /api/v1/admin/patients should return 200 for ADMIN', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/patients?page=1&limit=5',
        headers: adminHeaders,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.items).toBeDefined();
    });

    it('GET /api/v1/admin/doctors should return 200 for ADMIN', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/doctors?page=1&limit=5',
        headers: adminHeaders,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.items).toBeDefined();
    });

    it('GET /api/v1/admin/appointments should return 200 for ADMIN', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/appointments?page=1&limit=5',
        headers: adminHeaders,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.items).toBeDefined();
    });

    it('GET /api/v1/admin/care-relationships should return 200 for ADMIN', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/care-relationships?page=1&limit=5',
        headers: adminHeaders,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.items).toBeDefined();
    });

    it('GET /api/v1/admin/payments/overview should return 200 for ADMIN', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/payments/overview?page=1&limit=5',
        headers: adminHeaders,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.metrics).toBeDefined();
    });

    it('GET /api/v1/admin/notifications/overview should return 200 for ADMIN', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/notifications/overview',
        headers: adminHeaders,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.deliveries).toBeDefined();
      expect(typeof body.activeDevices).toBe('number');
    });

    it('GET /api/v1/admin/ai/safety-events should return 200 for ADMIN', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/ai/safety-events?page=1&limit=5',
        headers: adminHeaders,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.items).toBeDefined();
    });

    it('GET /api/v1/admin/ai/human-handoffs should return 200 for ADMIN', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/ai/human-handoffs?page=1&limit=5',
        headers: adminHeaders,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.items).toBeDefined();
    });

    it('GET /api/v1/admin/audit-logs should return 200 for ADMIN', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/audit-logs?page=1&limit=10',
        headers: adminHeaders,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.items).toBeDefined();
    });
  });

  describe('Emergency Platform Kill Switches', () => {
    it('GET /api/v1/admin/system/status should return 200 and operational status', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/system/status',
        headers: adminHeaders,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.status).toBeDefined();
      expect(body.subsystems).toBeInstanceOf(Array);
    });

    it('POST /api/v1/admin/system/kill-switches should toggle subsystem state', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/system/kill-switches',
        headers: adminHeaders,
        payload: {
          subsystem: 'REALTIME_VOICE_GATEWAY',
          enabled: false,
          justification: 'Elevated 502 Bad Gateway error rates during upstream provider incident',
        },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.subsystem).toBe('REALTIME_VOICE_GATEWAY');
      expect(body.enabled).toBe(false);

      // Verify system status reflects degraded shutdown
      const statusRes = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/system/status',
        headers: adminHeaders,
      });
      const statusBody = JSON.parse(statusRes.body);
      expect(statusBody.status).toBe('DEGRADED_EMERGENCY_SHUTDOWN');

      // Re-enable
      await app.inject({
        method: 'POST',
        url: '/api/v1/admin/system/kill-switches',
        headers: adminHeaders,
        payload: {
          subsystem: 'REALTIME_VOICE_GATEWAY',
          enabled: true,
          justification: 'Upstream provider restored full service',
        },
      });
    });

    it('POST /api/v1/admin/system/kill-switches should reject short justification (<10 chars)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/system/kill-switches',
        headers: adminHeaders,
        payload: {
          subsystem: 'PAYMENTS_GATEWAY',
          enabled: false,
          justification: 'Too short',
        },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('Break-Glass Clinical Incident Access Governance', () => {
    it('POST /api/v1/admin/clinical-incidents/break-glass should reject unacknowledged terms', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/clinical-incidents/break-glass',
        headers: adminHeaders,
        payload: {
          patientId: '00000000-0000-0000-0000-000000000002',
          incidentTicketId: 'INC-2026-0001',
          justification:
            'Critical safety review for adverse interaction with prescribed treatment.',
          acknowledgedTerms: false,
        },
      });
      expect(res.statusCode).toBe(400);
    });

    it('POST /api/v1/admin/clinical-incidents/break-glass should reject short justification (<20 chars)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/clinical-incidents/break-glass',
        headers: adminHeaders,
        payload: {
          patientId: '00000000-0000-0000-0000-000000000002',
          incidentTicketId: 'INC-2026-0001',
          justification: 'Short note',
          acknowledgedTerms: true,
        },
      });
      expect(res.statusCode).toBe(400);
    });

    it('POST /api/v1/admin/clinical-incidents/break-glass should return 404 for unknown patient', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/clinical-incidents/break-glass',
        headers: adminHeaders,
        payload: {
          patientId: 'e9999999-9999-4999-a999-999999999999',
          incidentTicketId: 'INC-2026-0002',
          justification: 'Formal investigation into adverse pharmacological alert.',
          acknowledgedTerms: true,
        },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('User Status Governance & Session Revocation', () => {
    it('POST /api/v1/admin/users/:userId/status should return 404 for non-existent user', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/users/e9999999-9999-4999-a999-999999999999/status',
        headers: adminHeaders,
        payload: {
          status: 'SUSPENDED',
          reason: 'Compromised account reported via IT support hotline',
        },
      });
      expect(res.statusCode).toBe(404);
    });

    it('POST /api/v1/admin/users/:userId/status should reject justification shorter than 5 chars', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/users/e9999999-9999-4999-a999-999999999999/status',
        headers: adminHeaders,
        payload: {
          status: 'SUSPENDED',
          reason: 'bad',
        },
      });
      expect(res.statusCode).toBe(400);
    });
  });
});

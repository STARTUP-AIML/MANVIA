import { describe, it, expect, beforeEach } from 'vitest';
import { TemplateEngineService } from '../../src/modules/notifications/services/template-engine.service.js';
import {
  NotificationType,
  NotificationChannel,
} from '../../src/modules/notifications/enums/index.js';

describe('TemplateEngineService (Unit)', () => {
  let templateEngine: TemplateEngineService;

  beforeEach(() => {
    templateEngine = new TemplateEngineService();
  });

  it('renders default English template with interpolated variables', () => {
    const rendered = templateEngine.render(
      NotificationType.APPOINTMENT_CONFIRMED,
      NotificationChannel.IN_APP,
      'en',
      {
        doctorName: 'Dr. Sarah Connor',
        date: '2026-10-15T10:00:00.000Z',
      },
      'UTC',
    );

    expect(rendered.title).toBe('Appointment Confirmed');
    expect(rendered.body).toContain('Dr. Sarah Connor');
  });

  it('resolves localized Telugu (te) template when available', () => {
    const rendered = templateEngine.render(
      NotificationType.APPOINTMENT_CONFIRMED,
      NotificationChannel.IN_APP,
      'te',
      {
        doctorName: 'డాక్టర్ స్మిత',
        date: '2026-10-15T10:00:00.000Z',
      },
      'Asia/Kolkata',
    );

    expect(rendered.title).toBe('అపాయింట్‌మెంట్ నిర్ధారించబడింది');
    expect(rendered.body).toContain('డాక్టర్ స్మిత');
  });

  it('falls back to default English when requested locale is unsupported', () => {
    const rendered = templateEngine.render(
      NotificationType.APPOINTMENT_CANCELLED,
      NotificationChannel.EMAIL,
      'de-DE', // Unsupported locale
      {
        userName: 'Hans',
        date: '2026-10-15T10:00:00.000Z',
      },
      'Europe/Berlin',
    );

    expect(rendered.title).toBe('MANVIA - Appointment Cancelled');
    expect(rendered.body).toContain('Hans');
  });

  it('respects user timezone when formatting ISO dates in templates', () => {
    const date = '2026-10-15T12:00:00.000Z';

    const renderedUtc = templateEngine.render(
      NotificationType.APPOINTMENT_CONFIRMED,
      NotificationChannel.IN_APP,
      'en',
      { doctorName: 'Dr. Stone', date },
      'UTC',
    );

    const renderedIst = templateEngine.render(
      NotificationType.APPOINTMENT_CONFIRMED,
      NotificationChannel.IN_APP,
      'en',
      { doctorName: 'Dr. Stone', date },
      'Asia/Kolkata',
    );

    // In UTC: 12:00 PM; In IST (+5:30): 5:30 PM
    expect(renderedUtc.body).toBeDefined();
    expect(renderedIst.body).toBeDefined();
    expect(renderedUtc.body).not.toEqual(renderedIst.body);
  });
});

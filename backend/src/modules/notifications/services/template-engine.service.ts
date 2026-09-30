import { NotificationType, NotificationChannel } from '../enums/index.js';

export interface RenderedTemplate {
  title: string;
  body: string;
}

export interface TemplateDefinition {
  type: NotificationType;
  channel: NotificationChannel;
  locale: string;
  titleTemplate: string;
  bodyTemplate: string;
  version: string;
}

export class TemplateEngineService {
  private readonly templates = new Map<string, TemplateDefinition>();

  public constructor() {
    this.registerDefaultTemplates();
  }

  private getKey(type: NotificationType, channel: NotificationChannel, locale: string): string {
    return `${type}:${channel}:${locale}`;
  }

  public registerTemplate(template: TemplateDefinition): void {
    const key = this.getKey(template.type, template.channel, template.locale);
    this.templates.set(key, template);
  }

  /**
   * Resolves template according to fallback chain:
   * 1. Exact locale (e.g., 'te')
   * 2. Regional/base language (e.g., 'en-US' -> 'en')
   * 3. Default English ('en')
   */
  public resolveTemplate(
    type: NotificationType,
    channel: NotificationChannel,
    requestedLocale: string = 'en',
  ): TemplateDefinition {
    const primaryKey = this.getKey(type, channel, requestedLocale);
    if (this.templates.has(primaryKey)) {
      return this.templates.get(primaryKey)!;
    }

    const baseLocale = (requestedLocale.split('-')[0] || 'en').toLowerCase();
    const baseKey = this.getKey(type, channel, baseLocale);
    if (this.templates.has(baseKey)) {
      return this.templates.get(baseKey)!;
    }

    const defaultKey = this.getKey(type, channel, 'en');
    if (this.templates.has(defaultKey)) {
      return this.templates.get(defaultKey)!;
    }

    // Generic fallback if channel-specific template isn't registered
    return {
      type,
      channel,
      locale: 'en',
      titleTemplate: 'MANVIA Notification',
      bodyTemplate: 'You have a new update from MANVIA.',
      version: 'v1',
    };
  }

  /**
   * Renders the template safely with token replacement.
   * Handles date formatting in the user's timezone.
   */
  public render(
    type: NotificationType,
    channel: NotificationChannel,
    locale: string,
    params: Record<string, unknown> = {},
    userTimezone: string = 'UTC',
  ): RenderedTemplate {
    const template = this.resolveTemplate(type, channel, locale);

    const formattedParams: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v instanceof Date) {
        try {
          formattedParams[k] = new Intl.DateTimeFormat(locale || 'en', {
            timeZone: userTimezone || 'UTC',
            dateStyle: 'medium',
            timeStyle: 'short',
          }).format(v);
        } catch {
          formattedParams[k] = v.toISOString();
        }
      } else if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
        const d = new Date(v);
        if (!isNaN(d.getTime())) {
          try {
            formattedParams[k] = new Intl.DateTimeFormat(locale || 'en', {
              timeZone: userTimezone || 'UTC',
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(d);
          } catch {
            formattedParams[k] = v;
          }
        } else {
          formattedParams[k] = String(v);
        }
      } else {
        formattedParams[k] = v !== null && v !== undefined ? String(v) : '';
      }
    }

    const title = this.interpolate(template.titleTemplate, formattedParams);
    const body = this.interpolate(template.bodyTemplate, formattedParams);

    return { title, body };
  }

  private interpolate(tmpl: string, values: Record<string, string>): string {
    return tmpl.replace(/{([a-zA-Z0-9_]+)}/g, (_, key) => {
      return values[key] ?? `{${key}}`;
    });
  }

  private registerDefaultTemplates(): void {
    const list: TemplateDefinition[] = [
      // APPOINTMENT_REQUESTED
      {
        type: NotificationType.APPOINTMENT_REQUESTED,
        channel: NotificationChannel.IN_APP,
        locale: 'en',
        titleTemplate: 'Appointment Requested',
        bodyTemplate: 'Your appointment request for {date} has been submitted.',
        version: 'v1',
      },
      {
        type: NotificationType.APPOINTMENT_REQUESTED,
        channel: NotificationChannel.EMAIL,
        locale: 'en',
        titleTemplate: 'MANVIA - Appointment Request Received',
        bodyTemplate:
          'Dear {userName}, your appointment request for {date} is currently awaiting confirmation.',
        version: 'v1',
      },
      {
        type: NotificationType.APPOINTMENT_REQUESTED,
        channel: NotificationChannel.PUSH,
        locale: 'en',
        titleTemplate: 'Appointment Requested',
        bodyTemplate: 'Your request for {date} was submitted.',
        version: 'v1',
      },

      // APPOINTMENT_CONFIRMED
      {
        type: NotificationType.APPOINTMENT_CONFIRMED,
        channel: NotificationChannel.IN_APP,
        locale: 'en',
        titleTemplate: 'Appointment Confirmed',
        bodyTemplate: 'Your appointment with {doctorName} on {date} is confirmed.',
        version: 'v1',
      },
      {
        type: NotificationType.APPOINTMENT_CONFIRMED,
        channel: NotificationChannel.EMAIL,
        locale: 'en',
        titleTemplate: 'Appointment Confirmed - MANVIA',
        bodyTemplate:
          'Hello {userName}, your consultation with {doctorName} is confirmed for {date}.',
        version: 'v1',
      },
      {
        type: NotificationType.APPOINTMENT_CONFIRMED,
        channel: NotificationChannel.PUSH,
        locale: 'en',
        titleTemplate: 'Appointment Confirmed',
        bodyTemplate: 'Consultation with {doctorName} scheduled for {date}.',
        version: 'v1',
      },
      {
        type: NotificationType.APPOINTMENT_CONFIRMED,
        channel: NotificationChannel.SMS,
        locale: 'en',
        titleTemplate: 'MANVIA',
        bodyTemplate: 'MANVIA: Your appointment on {date} is confirmed.',
        version: 'v1',
      },
      // APPOINTMENT_CONFIRMED in Telugu ('te')
      {
        type: NotificationType.APPOINTMENT_CONFIRMED,
        channel: NotificationChannel.IN_APP,
        locale: 'te',
        titleTemplate: 'అపాయింట్‌మెంట్ నిర్ధారించబడింది',
        bodyTemplate: '{date}న {doctorName}తో మీ అపాయింట్‌మెంట్ నిర్ధారించబడింది.',
        version: 'v1',
      },
      {
        type: NotificationType.APPOINTMENT_CONFIRMED,
        channel: NotificationChannel.EMAIL,
        locale: 'te',
        titleTemplate: 'MANVIA - అపాయింట్‌మెంట్ నిర్ధారణ',
        bodyTemplate: 'నమస్కారం {userName}, {date}న {doctorName}తో మీ అపాయింట్‌మెంట్ ఖరారైంది.',
        version: 'v1',
      },

      // APPOINTMENT_DECLINED
      {
        type: NotificationType.APPOINTMENT_DECLINED,
        channel: NotificationChannel.IN_APP,
        locale: 'en',
        titleTemplate: 'Appointment Declined',
        bodyTemplate: 'Your appointment request for {date} could not be confirmed.',
        version: 'v1',
      },
      {
        type: NotificationType.APPOINTMENT_DECLINED,
        channel: NotificationChannel.EMAIL,
        locale: 'en',
        titleTemplate: 'MANVIA - Appointment Request Update',
        bodyTemplate:
          'Dear {userName}, unfortunately your request for {date} could not be confirmed.',
        version: 'v1',
      },

      // APPOINTMENT_CANCELLED
      {
        type: NotificationType.APPOINTMENT_CANCELLED,
        channel: NotificationChannel.IN_APP,
        locale: 'en',
        titleTemplate: 'Appointment Cancelled',
        bodyTemplate: 'Your appointment scheduled for {date} has been cancelled.',
        version: 'v1',
      },
      {
        type: NotificationType.APPOINTMENT_CANCELLED,
        channel: NotificationChannel.EMAIL,
        locale: 'en',
        titleTemplate: 'MANVIA - Appointment Cancelled',
        bodyTemplate: 'Dear {userName}, your appointment scheduled for {date} has been cancelled.',
        version: 'v1',
      },
      {
        type: NotificationType.APPOINTMENT_CANCELLED,
        channel: NotificationChannel.PUSH,
        locale: 'en',
        titleTemplate: 'Appointment Cancelled',
        bodyTemplate: 'Your appointment for {date} has been cancelled.',
        version: 'v1',
      },

      // APPOINTMENT_REMINDER
      {
        type: NotificationType.APPOINTMENT_REMINDER,
        channel: NotificationChannel.IN_APP,
        locale: 'en',
        titleTemplate: 'Upcoming Appointment Reminder',
        bodyTemplate: 'You have an upcoming consultation with {doctorName} on {date}.',
        version: 'v1',
      },
      {
        type: NotificationType.APPOINTMENT_REMINDER,
        channel: NotificationChannel.PUSH,
        locale: 'en',
        titleTemplate: 'Appointment Reminder',
        bodyTemplate: 'Consultation with {doctorName} starts at {date}.',
        version: 'v1',
      },

      // WAITLIST_OFFER
      {
        type: NotificationType.WAITLIST_OFFER,
        channel: NotificationChannel.IN_APP,
        locale: 'en',
        titleTemplate: 'Waitlist Slot Available!',
        bodyTemplate:
          'An earlier appointment slot has opened up on {date}. Please accept before it expires.',
        version: 'v1',
      },
      {
        type: NotificationType.WAITLIST_OFFER,
        channel: NotificationChannel.PUSH,
        locale: 'en',
        titleTemplate: 'Waitlist Slot Available!',
        bodyTemplate: 'A slot opened for {date}. Tap to review.',
        version: 'v1',
      },
      {
        type: NotificationType.WAITLIST_OFFER,
        channel: NotificationChannel.EMAIL,
        locale: 'en',
        titleTemplate: 'MANVIA - Waitlist Slot Available',
        bodyTemplate: 'Dear {userName}, a slot is available on {date}. Expires at {expiresAt}.',
        version: 'v1',
      },

      // WAITLIST_EXPIRED
      {
        type: NotificationType.WAITLIST_EXPIRED,
        channel: NotificationChannel.IN_APP,
        locale: 'en',
        titleTemplate: 'Waitlist Offer Expired',
        bodyTemplate: 'The offered slot on {date} has expired and been released.',
        version: 'v1',
      },

      // WAITLIST_FULFILLED
      {
        type: NotificationType.WAITLIST_FULFILLED,
        channel: NotificationChannel.IN_APP,
        locale: 'en',
        titleTemplate: 'Waitlist Offer Accepted',
        bodyTemplate: 'You have successfully secured the waitlist slot on {date}.',
        version: 'v1',
      },

      // REFUND_REQUESTED
      {
        type: NotificationType.REFUND_REQUESTED,
        channel: NotificationChannel.IN_APP,
        locale: 'en',
        titleTemplate: 'Refund Requested',
        bodyTemplate: 'A refund of {currency} {amount} has been requested.',
        version: 'v1',
      },
      {
        type: NotificationType.REFUND_REQUESTED,
        channel: NotificationChannel.EMAIL,
        locale: 'en',
        titleTemplate: 'MANVIA - Refund Requested',
        bodyTemplate:
          'Dear {userName}, your refund request for {currency} {amount} is under review.',
        version: 'v1',
      },

      // REFUND_COMPLETED
      {
        type: NotificationType.REFUND_COMPLETED,
        channel: NotificationChannel.IN_APP,
        locale: 'en',
        titleTemplate: 'Refund Processed',
        bodyTemplate: 'Your refund of {currency} {amount} has been successfully processed.',
        version: 'v1',
      },
      {
        type: NotificationType.REFUND_COMPLETED,
        channel: NotificationChannel.EMAIL,
        locale: 'en',
        titleTemplate: 'MANVIA - Refund Processed Successfully',
        bodyTemplate:
          'Dear {userName}, your refund of {currency} {amount} has been issued to your payment method.',
        version: 'v1',
      },

      // REFUND_FAILED
      {
        type: NotificationType.REFUND_FAILED,
        channel: NotificationChannel.IN_APP,
        locale: 'en',
        titleTemplate: 'Refund Issue',
        bodyTemplate: 'We encountered an issue processing your refund of {currency} {amount}.',
        version: 'v1',
      },
      {
        type: NotificationType.REFUND_FAILED,
        channel: NotificationChannel.EMAIL,
        locale: 'en',
        titleTemplate: 'MANVIA - Refund Processing Issue',
        bodyTemplate:
          'Dear {userName}, we could not process your refund of {currency} {amount}. Reason: {reason}',
        version: 'v1',
      },

      // DOCTOR_VERIFICATION_SUBMITTED
      {
        type: NotificationType.DOCTOR_VERIFICATION_SUBMITTED,
        channel: NotificationChannel.IN_APP,
        locale: 'en',
        titleTemplate: 'Verification Documents Received',
        bodyTemplate:
          'Your medical verification documents have been received and are under review.',
        version: 'v1',
      },
      {
        type: NotificationType.DOCTOR_VERIFICATION_APPROVED,
        channel: NotificationChannel.IN_APP,
        locale: 'en',
        titleTemplate: 'Doctor Verification Approved',
        bodyTemplate: 'Congratulations! Your doctor profile has been verified and activated.',
        version: 'v1',
      },
      {
        type: NotificationType.DOCTOR_VERIFICATION_APPROVED,
        channel: NotificationChannel.EMAIL,
        locale: 'en',
        titleTemplate: 'MANVIA - Profile Verified',
        bodyTemplate: 'Congratulations Dr. {userName}! Your credentials have been verified.',
        version: 'v1',
      },
      {
        type: NotificationType.DOCTOR_VERIFICATION_REJECTED,
        channel: NotificationChannel.IN_APP,
        locale: 'en',
        titleTemplate: 'Verification Status Update',
        bodyTemplate:
          'Your verification could not be approved at this time. Please check your email.',
        version: 'v1',
      },
      {
        type: NotificationType.DOCTOR_VERIFICATION_REJECTED,
        channel: NotificationChannel.EMAIL,
        locale: 'en',
        titleTemplate: 'MANVIA - Verification Action Needed',
        bodyTemplate:
          'Dear Dr. {userName}, your verification could not be completed. Reason: {reason}',
        version: 'v1',
      },

      // SECURITY_LOGIN
      {
        type: NotificationType.SECURITY_LOGIN,
        channel: NotificationChannel.IN_APP,
        locale: 'en',
        titleTemplate: 'New Login Detected',
        bodyTemplate: 'A new login to your account was detected from {location}.',
        version: 'v1',
      },
      {
        type: NotificationType.SECURITY_LOGIN,
        channel: NotificationChannel.EMAIL,
        locale: 'en',
        titleTemplate: 'MANVIA - Security Alert: New Sign-in',
        bodyTemplate:
          'Dear {userName}, a new login was recorded on your account at {date}. If this was not you, please secure your account immediately.',
        version: 'v1',
      },

      // SECURITY_PASSWORD_CHANGED
      {
        type: NotificationType.SECURITY_PASSWORD_CHANGED,
        channel: NotificationChannel.IN_APP,
        locale: 'en',
        titleTemplate: 'Password Changed',
        bodyTemplate: 'Your password was successfully updated.',
        version: 'v1',
      },
      {
        type: NotificationType.SECURITY_PASSWORD_CHANGED,
        channel: NotificationChannel.EMAIL,
        locale: 'en',
        titleTemplate: 'MANVIA - Security Alert: Password Changed',
        bodyTemplate:
          'Dear {userName}, your password was changed at {date}. If you did not make this change, please contact support immediately.',
        version: 'v1',
      },

      // SECURITY_SESSION_REVOKED
      {
        type: NotificationType.SECURITY_SESSION_REVOKED,
        channel: NotificationChannel.IN_APP,
        locale: 'en',
        titleTemplate: 'Session Terminated',
        bodyTemplate: 'An active session for your account was terminated.',
        version: 'v1',
      },

      // WELLNESS_REMINDER
      {
        type: NotificationType.WELLNESS_REMINDER,
        channel: NotificationChannel.IN_APP,
        locale: 'en',
        titleTemplate: 'Wellness Check-In',
        bodyTemplate: 'Take a moment today to record your wellness check-in.',
        version: 'v1',
      },

      // SYSTEM_NOTIFICATION
      {
        type: NotificationType.SYSTEM_NOTIFICATION,
        channel: NotificationChannel.IN_APP,
        locale: 'en',
        titleTemplate: 'System Update',
        bodyTemplate: '{message}',
        version: 'v1',
      },
      {
        type: NotificationType.SYSTEM_NOTIFICATION,
        channel: NotificationChannel.EMAIL,
        locale: 'en',
        titleTemplate: 'MANVIA System Notice',
        bodyTemplate: '{message}',
        version: 'v1',
      },
    ];

    for (const t of list) {
      this.registerTemplate(t);
    }
  }
}

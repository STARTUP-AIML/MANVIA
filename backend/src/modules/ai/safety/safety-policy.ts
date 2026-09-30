export interface EmergencyRoutingConfig {
  emergencyNumber: string;
  crisisLineNumber?: string | undefined;
  organization: string;
  emergencyNotice: string;
}

export const EMERGENCY_ROUTING_TABLE: Record<string, EmergencyRoutingConfig> = {
  'en-US': {
    emergencyNumber: '911',
    crisisLineNumber: '988',
    organization: 'US National Emergency & 988 Suicide & Crisis Lifeline',
    emergencyNotice:
      'If you are experiencing a medical emergency or danger of self-harm, please call 911 or the 988 Suicide & Crisis Lifeline immediately.',
  },
  'en-GB': {
    emergencyNumber: '999',
    crisisLineNumber: '111',
    organization: 'UK Emergency Services & NHS 111',
    emergencyNotice:
      'If you are experiencing a medical emergency, call 999 immediately. For urgent medical concerns, call NHS 111.',
  },
  'en-CA': {
    emergencyNumber: '911',
    crisisLineNumber: '988',
    organization: 'Canada Emergency Services & Suicide Crisis Helpline',
    emergencyNotice:
      'If you are experiencing a medical emergency, call 911 or call/text 988 for suicide crisis assistance immediately.',
  },
  'en-AU': {
    emergencyNumber: '000',
    crisisLineNumber: '13 11 14',
    organization: 'Australian Emergency Services & Lifeline Australia',
    emergencyNotice:
      'If you are in immediate danger, call 000. For 24/7 crisis support, contact Lifeline on 13 11 14.',
  },
  'en-IN': {
    emergencyNumber: '112',
    crisisLineNumber: '9152987821',
    organization: 'India National Emergency & Tele-MANAS',
    emergencyNotice:
      'If you are facing an emergency, call 112 immediately. For psychosocial support, contact Tele-MANAS or local support services.',
  },
};

export const DEFAULT_EMERGENCY_ROUTING: EmergencyRoutingConfig = {
  emergencyNumber: 'Local Emergency Services',
  organization: 'Local Emergency Response',
  emergencyNotice:
    'MANVIA AI Companion is not an emergency response service. If you are experiencing a medical emergency, acute symptoms, or crisis, please contact your local emergency services immediately.',
};

export function getEmergencyRouting(locale?: string): EmergencyRoutingConfig {
  if (!locale) return DEFAULT_EMERGENCY_ROUTING;
  const normalized = locale.trim();
  return EMERGENCY_ROUTING_TABLE[normalized] ?? DEFAULT_EMERGENCY_ROUTING;
}

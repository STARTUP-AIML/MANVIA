export interface AIAuditEvent {
  event:
    | 'AI_CONVERSATION_CREATED'
    | 'AI_CONVERSATION_DELETED'
    | 'AI_CONVERSATION_ACCESSED'
    | 'AI_MESSAGE_SENT'
    | 'AI_RESPONSE_GENERATED'
    | 'AI_RESPONSE_FAILED'
    | 'AI_FEEDBACK_SUBMITTED'
    | 'AI_ACCESS_DENIED'
    | 'SAFETY_PRE_CHECK_TRIGGERED'
    | 'AI_MEMORY_CREATED'
    | 'AI_MEMORY_DELETED'
    | 'REALTIME_SESSION_CREATED'
    | 'REALTIME_STATE_TRANSITION'
    | 'REALTIME_BARGE_IN_INTERRUPTED'
    | 'REALTIME_SESSION_ENDED'
    | 'AI_HANDOFF_REQUESTED'
    | 'AI_HANDOFF_CANCELLED'
    | 'AI_HANDOFF_ACCEPTED'
    | string;
  actorId: string;
  role: string;
  resource: string;
  action: string;
  metadata?: Record<string, unknown> | undefined;
}

export interface IAIAuditService {
  logEvent(event: AIAuditEvent): void;
}

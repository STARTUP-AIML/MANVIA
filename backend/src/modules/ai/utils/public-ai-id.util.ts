import { randomBytes } from 'node:crypto';

const CROCKFORD_BASE32 = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function generateRandomCrockford(length: number): string {
  const bytes = randomBytes(length);
  let id = '';
  for (let i = 0; i < length; i++) {
    const byte = bytes[i];
    if (byte !== undefined) {
      id += CROCKFORD_BASE32[byte % CROCKFORD_BASE32.length];
    }
  }
  return id;
}

export function generatePublicConversationId(): string {
  return `AIC-${generateRandomCrockford(8)}`;
}

export function generatePublicMessageId(): string {
  return `AIM-${generateRandomCrockford(8)}`;
}

export function generatePublicSourceId(): string {
  return `SRC-${generateRandomCrockford(8)}`;
}

export function generatePublicSafetyEventId(): string {
  return `SEV-${generateRandomCrockford(8)}`;
}

export function generatePublicMemoryId(): string {
  return `MEM-${generateRandomCrockford(8)}`;
}

export function generatePublicRealtimeSessionId(): string {
  return `RTS-${generateRandomCrockford(8)}`;
}

export function generatePublicHandoffId(): string {
  return `AIH-${generateRandomCrockford(8)}`;
}

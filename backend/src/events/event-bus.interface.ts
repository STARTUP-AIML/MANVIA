/**
 * Event Bus Abstraction (ADR-007)
 *
 * Implements asynchronous event messaging (Redis Streams / In-memory).
 */

export interface IDomainEvent<T = unknown> {
  eventId: string;
  eventType: string;
  aggregateId: string;
  occurredAt: Date;
  payload: T;
  metadata?: Record<string, unknown>;
}

export type EventHandler<T = unknown> = (event: IDomainEvent<T>) => Promise<void>;

export interface IEventBus {
  publish<T>(event: IDomainEvent<T>): Promise<void>;
  subscribe<T>(eventType: string, handler: EventHandler<T>): Promise<void>;
  unsubscribe(eventType: string, handler: EventHandler): Promise<void>;
}

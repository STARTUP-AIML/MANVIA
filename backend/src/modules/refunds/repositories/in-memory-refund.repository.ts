import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { RefundStatus } from '../enums/refund-status.enum.js';
import type { RefundEntity } from '../entities/refund.entity.js';
import type {
  CreateRefundParams,
  FindRefundsParams,
  IRefundRepository,
  UpdateRefundParams,
} from '../interfaces/refund-repository.interface.js';

@Injectable()
export class InMemoryRefundRepository implements IRefundRepository {
  private readonly items = new Map<string, RefundEntity>();

  public async createRefund(params: CreateRefundParams): Promise<RefundEntity> {
    const id = randomUUID();
    const now = new Date();
    const entity: RefundEntity = {
      id,
      publicRefundId: params.publicRefundId,
      appointmentId: params.appointmentId,
      paymentId: params.paymentId ?? null,
      amount: params.amount,
      currency: params.currency,
      reason: params.reason,
      status: params.status ?? RefundStatus.REQUESTED,
      idempotencyKey: params.idempotencyKey ?? null,
      requestedAt: now,
      processedAt: null,
      failureReason: null,
      providerReference: null,
      metadata: params.metadata ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.items.set(id, entity);
    return { ...entity };
  }

  public async findById(id: string): Promise<RefundEntity | null> {
    const entity = this.items.get(id);
    return entity ? { ...entity } : null;
  }

  public async findByPublicId(publicId: string): Promise<RefundEntity | null> {
    for (const item of this.items.values()) {
      if (item.publicRefundId === publicId) {
        return { ...item };
      }
    }
    return null;
  }

  public async findByAppointmentId(appointmentId: string): Promise<RefundEntity[]> {
    const results: RefundEntity[] = [];
    for (const item of this.items.values()) {
      if (item.appointmentId === appointmentId) {
        results.push({ ...item });
      }
    }
    return results;
  }

  public async findByIdempotencyKey(key: string): Promise<RefundEntity | null> {
    for (const item of this.items.values()) {
      if (item.idempotencyKey === key) {
        return { ...item };
      }
    }
    return null;
  }

  public async updateRefund(id: string, params: UpdateRefundParams): Promise<RefundEntity> {
    const existing = this.items.get(id);
    if (!existing) {
      throw new Error(`Refund with id ${id} not found`);
    }

    const updated: RefundEntity = {
      ...existing,
      status: params.status ?? existing.status,
      processedAt: params.processedAt !== undefined ? params.processedAt : existing.processedAt,
      failureReason:
        params.failureReason !== undefined ? params.failureReason : existing.failureReason,
      providerReference:
        params.providerReference !== undefined
          ? params.providerReference
          : existing.providerReference,
      metadata: params.metadata !== undefined ? params.metadata : existing.metadata,
      updatedAt: new Date(),
    };

    this.items.set(id, updated);
    return { ...updated };
  }

  public async findRefunds(
    params: FindRefundsParams,
  ): Promise<{ data: RefundEntity[]; total: number }> {
    let list = Array.from(this.items.values());

    if (params.appointmentId) {
      list = list.filter((r) => r.appointmentId === params.appointmentId);
    }
    if (params.appointmentIds && params.appointmentIds.length > 0) {
      const idSet = new Set(params.appointmentIds);
      list = list.filter((r) => idSet.has(r.appointmentId));
    }
    if (params.status) {
      list = list.filter((r) => r.status === params.status);
    }

    list.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());

    const total = list.length;
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;
    const data = list.slice(skip, skip + limit).map((r) => ({ ...r }));

    return { data, total };
  }

  public clear(): void {
    this.items.clear();
  }
}

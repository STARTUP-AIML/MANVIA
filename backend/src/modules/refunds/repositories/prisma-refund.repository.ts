import { Injectable, Optional } from '@nestjs/common';
import type { RefundEntity } from '../entities/refund.entity.js';
import { RefundStatus } from '../enums/refund-status.enum.js';
import type {
  CreateRefundParams,
  FindRefundsParams,
  IRefundRepository,
  UpdateRefundParams,
} from '../interfaces/refund-repository.interface.js';

interface RawRefund {
  id: string;
  publicRefundId: string;
  appointmentId: string;
  paymentId: string | null;
  amount: { toString(): string } | number;
  currency: string;
  reason: string;
  status: RefundStatus;
  idempotencyKey: string | null;
  requestedAt: string | Date;
  processedAt: string | Date | null;
  failureReason: string | null;
  providerReference: string | null;
  metadata: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface PrismaModelDelegate<T = Record<string, unknown>> {
  create(args: { data: Record<string, unknown> }): Promise<T>;
  findUnique(args: { where: Record<string, unknown> }): Promise<T | null>;
  findFirst?(args: { where: Record<string, unknown> }): Promise<T | null>;
  findMany(args?: {
    where?: Record<string, unknown>;
    orderBy?: Record<string, 'asc' | 'desc'> | Array<Record<string, 'asc' | 'desc'>>;
    skip?: number;
    take?: number;
  }): Promise<T[]>;
  update(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<T>;
  count?(args?: { where?: Record<string, unknown> }): Promise<number>;
}

interface PrismaClientLike {
  refund: PrismaModelDelegate<RawRefund>;
}

@Injectable()
export class PrismaRefundRepository implements IRefundRepository {
  private readonly prisma: PrismaClientLike | undefined;

  constructor(@Optional() prisma?: PrismaClientLike | undefined) {
    this.prisma = prisma;
  }

  private getClient(): PrismaClientLike {
    if (!this.prisma) {
      throw new Error(
        'PrismaClient is not initialized in PrismaRefundRepository. Provide a valid Prisma client or use InMemoryRefundRepository.',
      );
    }
    return this.prisma;
  }

  private toEntity(raw: RawRefund): RefundEntity {
    return {
      id: raw.id,
      publicRefundId: raw.publicRefundId,
      appointmentId: raw.appointmentId,
      paymentId: raw.paymentId,
      amount: typeof raw.amount === 'number' ? raw.amount : Number(raw.amount.toString()),
      currency: raw.currency,
      reason: raw.reason,
      status: raw.status,
      idempotencyKey: raw.idempotencyKey,
      requestedAt: new Date(raw.requestedAt),
      processedAt: raw.processedAt ? new Date(raw.processedAt) : null,
      failureReason: raw.failureReason,
      providerReference: raw.providerReference,
      metadata: raw.metadata,
      createdAt: new Date(raw.createdAt),
      updatedAt: new Date(raw.updatedAt),
    };
  }

  public async createRefund(params: CreateRefundParams): Promise<RefundEntity> {
    const client = this.getClient();
    const raw = await client.refund.create({
      data: {
        publicRefundId: params.publicRefundId,
        appointmentId: params.appointmentId,
        paymentId: params.paymentId ?? null,
        amount: params.amount,
        currency: params.currency,
        reason: params.reason,
        status: params.status ?? RefundStatus.REQUESTED,
        idempotencyKey: params.idempotencyKey ?? null,
        metadata: params.metadata ?? null,
      },
    });
    return this.toEntity(raw);
  }

  public async findById(id: string): Promise<RefundEntity | null> {
    const client = this.getClient();
    const raw = await client.refund.findUnique({
      where: { id },
    });
    return raw ? this.toEntity(raw) : null;
  }

  public async findByPublicId(publicId: string): Promise<RefundEntity | null> {
    const client = this.getClient();
    const raw = await client.refund.findUnique({
      where: { publicRefundId: publicId },
    });
    return raw ? this.toEntity(raw) : null;
  }

  public async findByAppointmentId(appointmentId: string): Promise<RefundEntity[]> {
    const client = this.getClient();
    const rawList = await client.refund.findMany({
      where: { appointmentId },
      orderBy: { requestedAt: 'desc' },
    });
    return rawList.map((r) => this.toEntity(r));
  }

  public async findByIdempotencyKey(key: string): Promise<RefundEntity | null> {
    const client = this.getClient();
    const raw = await client.refund.findUnique({
      where: { idempotencyKey: key },
    });
    return raw ? this.toEntity(raw) : null;
  }

  public async updateRefund(id: string, params: UpdateRefundParams): Promise<RefundEntity> {
    const client = this.getClient();
    const updateData: Record<string, unknown> = {};

    if (params.status !== undefined) updateData.status = params.status;
    if (params.processedAt !== undefined) updateData.processedAt = params.processedAt;
    if (params.failureReason !== undefined) updateData.failureReason = params.failureReason;
    if (params.providerReference !== undefined)
      updateData.providerReference = params.providerReference;
    if (params.metadata !== undefined) updateData.metadata = params.metadata;

    const raw = await client.refund.update({
      where: { id },
      data: updateData,
    });
    return this.toEntity(raw);
  }

  public async findRefunds(
    params: FindRefundsParams,
  ): Promise<{ data: RefundEntity[]; total: number }> {
    const client = this.getClient();
    const where: Record<string, unknown> = {};

    if (params.appointmentId) where.appointmentId = params.appointmentId;
    if (params.status) where.status = params.status;

    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const [rawList, count] = await Promise.all([
      client.refund.findMany({
        where,
        orderBy: { requestedAt: 'desc' },
        skip,
        take: limit,
      }),
      client.refund.count ? client.refund.count({ where }) : Promise.resolve(0),
    ]);

    return {
      data: rawList.map((r) => this.toEntity(r)),
      total: count,
    };
  }
}

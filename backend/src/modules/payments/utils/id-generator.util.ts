import { randomBytes } from 'crypto';

export class IdGeneratorUtil {
  public static generatePublicPaymentId(): string {
    return `PAY-${randomBytes(8).toString('hex').toUpperCase()}`;
  }

  public static generatePublicAttemptId(): string {
    return `ATT-${randomBytes(8).toString('hex').toUpperCase()}`;
  }

  public static generateInvoiceNumber(): string {
    const now = new Date();
    const yearMonth = `${now.getUTCFullYear()}${(now.getUTCMonth() + 1).toString().padStart(2, '0')}`;
    const rand = randomBytes(4).toString('hex').toUpperCase();
    return `INV-${yearMonth}-${rand}`;
  }

  public static generatePublicInvoiceId(): string {
    return `INV-${randomBytes(8).toString('hex').toUpperCase()}`;
  }

  public static generatePublicPayoutId(): string {
    return `PO-${randomBytes(8).toString('hex').toUpperCase()}`;
  }

  public static generatePublicTransactionId(): string {
    return `FTX-${randomBytes(8).toString('hex').toUpperCase()}`;
  }
}

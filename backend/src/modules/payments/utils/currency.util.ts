/**
 * Utility functions for exact currency handling.
 * Avoids IEEE 754 floating point arithmetic issues by operating on integer minor units (cents/paise).
 */

export class CurrencyUtil {
  /**
   * Converts a decimal amount (e.g. 99.50) to minor units (e.g. 9950 cents).
   */
  public static toMinorUnits(amount: number | string): number {
    const numeric = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numeric)) {
      throw new Error(`Invalid monetary amount: ${amount}`);
    }
    return Math.round(numeric * 100);
  }

  /**
   * Converts integer minor units (e.g. 9950) to formatted decimal string (e.g. "99.50").
   */
  public static toDecimalString(minorUnits: number): string {
    const integerPart = Math.floor(minorUnits / 100);
    const decimalPart = Math.abs(minorUnits % 100);
    return `${integerPart}.${decimalPart.toString().padStart(2, '0')}`;
  }

  /**
   * Converts integer minor units to numeric decimal.
   */
  public static toDecimalNumber(minorUnits: number): number {
    return Math.round(minorUnits) / 100;
  }

  /**
   * Adds two monetary amounts represented as strings or numbers, returning exact string decimal.
   */
  public static add(a: number | string, b: number | string): string {
    const minorA = this.toMinorUnits(a);
    const minorB = this.toMinorUnits(b);
    return this.toDecimalString(minorA + minorB);
  }

  /**
   * Subtracts b from a, returning exact string decimal.
   */
  public static subtract(a: number | string, b: number | string): string {
    const minorA = this.toMinorUnits(a);
    const minorB = this.toMinorUnits(b);
    return this.toDecimalString(minorA - minorB);
  }

  /**
   * Multiplies an amount by a basis points (1 bp = 0.01% = 0.0001).
   * e.g., 500 basis points = 5%.
   */
  public static applyBasisPoints(amount: number | string, basisPoints: number): string {
    const minor = this.toMinorUnits(amount);
    const resultMinor = Math.round((minor * basisPoints) / 10000);
    return this.toDecimalString(resultMinor);
  }

  /**
   * Multiplies an amount by a percentage rate (e.g. 18 for 18%).
   */
  public static applyPercentage(amount: number | string, percentage: number): string {
    const minor = this.toMinorUnits(amount);
    const resultMinor = Math.round((minor * percentage) / 100);
    return this.toDecimalString(resultMinor);
  }
}

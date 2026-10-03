import { describe, it, expect } from 'vitest';
import { CurrencyUtil } from '../../src/modules/payments/utils/currency.util.js';

describe('CurrencyUtil (Unit Tests)', () => {
  it('should convert decimal amounts to minor units without floating point inaccuracy', () => {
    expect(CurrencyUtil.toMinorUnits('99.50')).toBe(9950);
    expect(CurrencyUtil.toMinorUnits(99.5)).toBe(9950);
    expect(CurrencyUtil.toMinorUnits('0.05')).toBe(5);
    expect(CurrencyUtil.toMinorUnits('1234.56')).toBe(123456);
  });

  it('should throw error for invalid monetary string', () => {
    expect(() => CurrencyUtil.toMinorUnits('invalid')).toThrow(/Invalid monetary amount/);
  });

  it('should convert minor units to formatted decimal string', () => {
    expect(CurrencyUtil.toDecimalString(9950)).toBe('99.50');
    expect(CurrencyUtil.toDecimalString(5)).toBe('0.05');
    expect(CurrencyUtil.toDecimalString(100)).toBe('1.00');
    expect(CurrencyUtil.toDecimalString(0)).toBe('0.00');
  });

  it('should convert minor units to numeric decimal', () => {
    expect(CurrencyUtil.toDecimalNumber(9950)).toBe(99.5);
    expect(CurrencyUtil.toDecimalNumber(5)).toBe(0.05);
  });

  it('should perform exact addition and subtraction', () => {
    expect(CurrencyUtil.add('19.99', '0.01')).toBe('20.00');
    expect(CurrencyUtil.subtract('20.00', '0.01')).toBe('19.99');
  });

  it('should apply basis points and percentages correctly', () => {
    // 500 basis points = 5%
    expect(CurrencyUtil.applyBasisPoints('100.00', 500)).toBe('5.00');
    // 15%
    expect(CurrencyUtil.applyPercentage('100.00', 15)).toBe('15.00');
  });
});

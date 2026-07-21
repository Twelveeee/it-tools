import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RSA_BITS,
  MAX_RSA_BITS,
  MIN_RSA_BITS,
  validateRsaBits,
} from './rsa-key-pair-generator.service';

describe('RSA key-pair generator', () => {
  it('uses a 3072-bit default and refuses undersized keys', () => {
    expect(DEFAULT_RSA_BITS).toBe(3072);
    expect(MIN_RSA_BITS).toBe(2048);
    expect(() => validateRsaBits(1024)).toThrow(RangeError);
  });

  it('accepts supported key sizes', () => {
    expect(() => validateRsaBits(MIN_RSA_BITS)).not.toThrow();
    expect(() => validateRsaBits(DEFAULT_RSA_BITS)).not.toThrow();
    expect(() => validateRsaBits(MAX_RSA_BITS)).not.toThrow();
  });

  it('rejects invalid or excessively large key sizes', () => {
    expect(() => validateRsaBits(2049)).toThrow(RangeError);
    expect(() => validateRsaBits(MAX_RSA_BITS + 8)).toThrow(RangeError);
    expect(() => validateRsaBits(Number.NaN)).toThrow(RangeError);
  });
});

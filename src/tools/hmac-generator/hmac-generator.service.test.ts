import { describe, expect, it } from 'vitest';
import {
  HMAC_KECCAK_512_LABEL,
  computeHmacKeccak512,
} from './hmac-generator.service';

describe('HMAC Keccak labeling', () => {
  it('does not present CryptoJS HmacSHA3 as NIST HMAC-SHA3', () => {
    expect(HMAC_KECCAK_512_LABEL).toContain('HMAC-Keccak-512');
    expect(HMAC_KECCAK_512_LABEL).not.toContain('SHA3-512');
    expect(computeHmacKeccak512('abc', 'key').toString()).toBe(
      'e4f4eee6c36430b8b870fd98ae4cd51a488b11754b1f0123d4743c42fa315e201ad5c21df0bb8dee9009daf93bd9c1a1343a52fef5494810a837edd0b5d95712',
    );
  });
});

import { describe, expect, it } from 'vitest';
import { KECCAK_512_LABEL, computeKeccak512, convertHexToBin } from './hash-text.service';

describe('hash text', () => {
  describe('convertHexToBin', () => {
    it('convert hex to bin', () => {
      expect(convertHexToBin('')).toEqual('');
      expect(convertHexToBin('FF')).toEqual('11111111');
      expect(convertHexToBin('F'.repeat(200))).toEqual('1111'.repeat(200));
      expect(convertHexToBin('2123006AD00F694CE120')).toEqual(
        '00100001001000110000000001101010110100000000111101101001010011001110000100100000',
      );
    });
  });

  it('labels the CryptoJS SHA3 implementation as Keccak-512', () => {
    expect(KECCAK_512_LABEL).toContain('Keccak-512');
    expect(KECCAK_512_LABEL).not.toContain('SHA3-512');
    expect(computeKeccak512('abc').toString()).toBe(
      '18587dc2ea106b9a1563e32b3312421ca164c7f1f07bc922a9c83d77cea3a1e5d0c69910739025372dc14ac9642629379540c17e2a65b19d77aa511a9d00bb96',
    );
  });
});

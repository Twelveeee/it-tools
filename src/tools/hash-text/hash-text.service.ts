import { SHA3 } from 'crypto-js';

export const KECCAK_512_LABEL = 'Keccak-512';

export function computeKeccak512(value: string) {
  return SHA3(value, { outputLength: 512 });
}

export function convertHexToBin(hex: string) {
  return hex
    .trim()
    .split('')
    .map(byte => Number.parseInt(byte, 16).toString(2).padStart(4, '0'))
    .join('');
}

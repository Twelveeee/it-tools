import { HmacSHA3 } from 'crypto-js';

export const HMAC_KECCAK_512_LABEL = 'HMAC-Keccak-512';

export function computeHmacKeccak512(value: string, secret: string) {
  return HmacSHA3(value, secret);
}

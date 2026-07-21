import { describe, expect, it } from 'vitest';
import { JWT_DECODE_ONLY_WARNING, decodeJwt } from './jwt-parser.service';

describe('JWT parser', () => {
  it('makes the decode-only trust boundary explicit', () => {
    expect(JWT_DECODE_ONLY_WARNING).toContain('Decode only');
    expect(JWT_DECODE_ONLY_WARNING).toContain('signature');
    expect(JWT_DECODE_ONLY_WARNING).toContain('not verified');
  });

  it('decodes claims even when the signature is forged', () => {
    const forgedJwt = [
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      'eyJhZG1pbiI6dHJ1ZX0',
      'definitely-not-a-valid-signature',
    ].join('.');

    const decoded = decodeJwt({ jwt: forgedJwt });
    expect(decoded.payload).toContainEqual(expect.objectContaining({ claim: 'admin', value: 'true' }));
  });
});

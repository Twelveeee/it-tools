import { describe, expect, it } from 'vitest';
import { ENCRYPTION_ENVELOPE_PREFIX, decryptText, encryptText } from './encryption.service';

describe('authenticated text encryption', () => {
  it('round-trips Unicode plaintext in a versioned envelope', async () => {
    const plaintext = 'Sensitive text 🔐';
    const encrypted = await encryptText({ plaintext, password: 'correct horse battery staple' });

    expect(encrypted).toMatch(new RegExp(`^${ENCRYPTION_ENVELOPE_PREFIX}\\.`));
    expect(encrypted).not.toContain(plaintext);
    await expect(decryptText({
      envelope: encrypted,
      password: 'correct horse battery staple',
    })).resolves.toBe(plaintext);
  });

  it('uses fresh salt and nonce for every encryption', async () => {
    const first = await encryptText({ plaintext: 'same', password: 'same password' });
    const second = await encryptText({ plaintext: 'same', password: 'same password' });

    expect(first).not.toBe(second);
  });

  it('rejects a wrong password or modified ciphertext', async () => {
    const encrypted = await encryptText({ plaintext: 'secret', password: 'right password' });
    const tampered = `${encrypted.slice(0, -2)}AA`;

    await expect(decryptText({ envelope: encrypted, password: 'wrong password' })).rejects.toThrow();
    await expect(decryptText({ envelope: tampered, password: 'right password' })).rejects.toThrow();
  });

  it('rejects missing passwords and legacy formats', async () => {
    await expect(encryptText({ plaintext: 'secret', password: '' })).rejects.toThrow('password');
    await expect(decryptText({ envelope: 'U2FsdGVkX1legacy', password: 'password' }))
      .rejects.toThrow('Unsupported or malformed');
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_TOKEN_LENGTH, TOKEN_SYMBOLS, createToken } from './token-generator.service';

describe('token-generator', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createToken', () => {
    it('should generate an empty string when all params are false', () => {
      const token = createToken({
        withLowercase: false,
        withUppercase: false,
        withNumbers: false,
        withSymbols: false,
        length: 10,
      });

      expect(token).toHaveLength(0);
    });

    it('should generate a random string with the specified length', () => {
      const createTokenWithLength = (length: number) =>
        createToken({
          withLowercase: true,
          withUppercase: true,
          withNumbers: true,
          withSymbols: true,
          length,
        });

      expect(createTokenWithLength(5)).toHaveLength(5);
      expect(createTokenWithLength(10)).toHaveLength(10);
      expect(createTokenWithLength(100)).toHaveLength(100);
    });

    it('should generate a random string with just uppercase if only withUppercase is set', () => {
      const token = createToken({
        withLowercase: false,
        withUppercase: true,
        withNumbers: false,
        withSymbols: false,
        length: 256,
      });

      expect(token).toHaveLength(256);
      expect(token).toMatch(/^[A-Z]+$/);
    });

    it('should generate a random string with just lowercase if only withLowercase is set', () => {
      const token = createToken({
        withLowercase: true,
        withUppercase: false,
        withNumbers: false,
        withSymbols: false,
        length: 256,
      });

      expect(token).toHaveLength(256);
      expect(token).toMatch(/^[a-z]+$/);
    });

    it('should generate a random string with just numbers if only withNumbers is set', () => {
      const token = createToken({
        withLowercase: false,
        withUppercase: false,
        withNumbers: true,
        withSymbols: false,
        length: 256,
      });

      expect(token).toHaveLength(256);
      expect(token).toMatch(/^[0-9]+$/);
    });

    it('should generate a random string with just symbols if only withSymbols is set', () => {
      const token = createToken({
        withLowercase: false,
        withUppercase: false,
        withNumbers: false,
        withSymbols: true,
        length: 256,
      });

      expect(token).toHaveLength(256);
      expect(token).toMatch(/^[.,;:!?./\-"'#{([-|\\@)\]=}*+]+$/);
    });

    it('should generate a random string with just letters (case incensitive) with withLowercase and withUppercase', () => {
      const token = createToken({
        withLowercase: true,
        withUppercase: true,
        withNumbers: false,
        withSymbols: false,
        length: 256,
      });

      expect(token).toHaveLength(256);
      expect(token).toMatch(/^[a-zA-Z]+$/);
    });

    it('includes every ASCII letter in the default alphabets', () => {
      const values = Array.from({ length: 52 }, (_, index) => index);
      vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((array) => {
        if (!array) {
          throw new TypeError('Expected a typed array');
        }
        new Uint32Array(array.buffer, array.byteOffset, 1)[0] = values.shift() ?? 0;
        return array;
      });

      expect(createToken({ withNumbers: false, length: 52 })).toBe(
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
      );
    });

    it('rejects lengths that could exhaust browser memory', () => {
      expect(() => createToken({ length: MAX_TOKEN_LENGTH + 1 })).toThrow(RangeError);
      expect(() => createToken({ length: 1.5 })).toThrow(RangeError);
    });

    it('selects custom alphabet characters directly with Web Crypto', () => {
      const values = [0xFFFF_FFFF, 2];
      const getRandomValues = vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((array) => {
        if (!array) {
          throw new TypeError('Expected a typed array');
        }
        new Uint32Array(array.buffer, array.byteOffset, 1)[0] = values.shift() ?? 0;
        return array;
      });

      expect(createToken({ alphabet: 'abc', length: 1 })).toBe('c');
      expect(getRandomValues).toHaveBeenCalledTimes(2);
    });

    it('deduplicates alphabets so each distinct character has equal weight', () => {
      expect(new Set(TOKEN_SYMBOLS).size).toBe(Array.from(TOKEN_SYMBOLS).length);

      vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((array) => {
        if (!array) {
          throw new TypeError('Expected a typed array');
        }
        new Uint32Array(array.buffer, array.byteOffset, 1)[0] = 1;
        return array;
      });

      expect(createToken({ alphabet: 'aab', length: 1 })).toBe('b');
    });
  });
});

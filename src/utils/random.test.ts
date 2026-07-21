import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateRandomId, randIntFromInterval, shuffleArray } from './random';

function mockRandomUint32(values: number[]) {
  return vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((array) => {
    if (!array) {
      throw new TypeError('Expected a typed array');
    }
    const view = new Uint32Array(array.buffer, array.byteOffset, 1);
    const value = values.shift();
    if (value === undefined) {
      throw new Error('No mocked random values remaining');
    }
    view[0] = value;
    return array;
  });
}

describe('secure random utilities', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses rejection sampling instead of modulo bias', () => {
    const getRandomValues = mockRandomUint32([0xFFFF_FFFF, 7]);

    expect(randIntFromInterval(0, 10)).toBe(7);
    expect(getRandomValues).toHaveBeenCalledTimes(2);
  });

  it('validates intervals', () => {
    expect(() => randIntFromInterval(1, 1)).toThrow(RangeError);
    expect(() => randIntFromInterval(0.5, 2)).toThrow(RangeError);
  });

  it('shuffles with Web Crypto randomness', () => {
    const getRandomValues = mockRandomUint32([0, 0]);

    expect(shuffleArray(['a', 'b', 'c'])).toEqual(['b', 'c', 'a']);
    expect(getRandomValues).toHaveBeenCalledTimes(2);
  });

  it('generates ids from random bytes', () => {
    vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((array) => {
      if (!array) {
        throw new TypeError('Expected a typed array');
      }
      new Uint8Array(array.buffer, array.byteOffset, array.byteLength).fill(0xAB);
      return array;
    });

    expect(generateRandomId()).toBe('id-abababababababababab');
  });
});

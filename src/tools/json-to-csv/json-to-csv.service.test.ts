import { describe, expect, it } from 'vitest';
import { convertArrayToCsv, getHeaders } from './json-to-csv.service';

describe('json-to-csv service', () => {
  describe('getHeaders', () => {
    it('extracts all the keys from the array of objects', () => {
      expect(getHeaders({ array: [{ a: 1, b: 2 }, { a: 3, c: 4 }] })).toEqual(['a', 'b', 'c']);
    });

    it('returns an empty array if the array is empty', () => {
      expect(getHeaders({ array: [] })).toEqual([]);
    });
  });

  describe('convertArrayToCsv', () => {
    it('converts an array of objects to RFC 4180 CSV', () => {
      expect(convertArrayToCsv({ array: [{ a: 1, b: 2 }, { a: 3, b: 4 }] })).toBe('a,b\r\n1,2\r\n3,4');
    });

    it('supports records with different keys', () => {
      expect(convertArrayToCsv({ array: [{ a: 1, b: 2 }, { a: 3, c: 4 }] })).toBe('a,b,c\r\n1,2,\r\n3,,4');
    });

    it('serializes null and undefined consistently', () => {
      expect(convertArrayToCsv({ array: [{ a: null, b: undefined }] })).toBe('a,b\r\nnull,');
    });

    it('quotes commas, line breaks, and double quotes', () => {
      expect(convertArrayToCsv({ array: [{ a: 'hello, "world"\nagain' }] }))
        .toBe('a\r\n"hello, ""world""\nagain"');
    });

    it('protects spreadsheet formulas by default', () => {
      expect(convertArrayToCsv({ array: [{ value: '=HYPERLINK("https://example.com")' }] }))
        .toBe('value\r\n"\'=HYPERLINK(""https://example.com"")"');
    });

    it('allows formula protection to be disabled explicitly', () => {
      expect(convertArrayToCsv({ array: [{ value: '=1+1' }], protectFormulas: false })).toBe('value\r\n=1+1');
    });

    it('escapes headers that contain CSV control characters', () => {
      expect(convertArrayToCsv({ array: [{ 'a,b': 1 }] })).toBe('"a,b"\r\n1');
    });

    it('protects formula-like headers and values after line breaks', () => {
      expect(convertArrayToCsv({ array: [{ '=FORMULA': '\n@command' }] })).toBe('\'=FORMULA\r\n"\'\n@command"');
    });
  });
});

import { describe, expect, it } from 'vitest';
import { getPaletteOptionAtIndex, normalizePaletteOptionIndex } from './command-palette.models';

describe('command palette selection', () => {
  it('has no active option when filtering returns no results', () => {
    expect(normalizePaletteOptionIndex({ index: 0, optionCount: 0 })).toBe(-1);
    expect(getPaletteOptionAtIndex([], -1)).toBeUndefined();
  });

  it('clamps the selection against the filtered option count', () => {
    expect(normalizePaletteOptionIndex({ index: 5, optionCount: 2 })).toBe(1);
    expect(normalizePaletteOptionIndex({ index: -1, optionCount: 2 })).toBe(0);
  });
});

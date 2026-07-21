import type { PaletteOption } from './command-palette.types';

export function normalizePaletteOptionIndex({
  index,
  optionCount,
}: {
  index: number
  optionCount: number
}) {
  if (optionCount === 0) {
    return -1;
  }

  return Math.min(Math.max(index, 0), optionCount - 1);
}

export function getPaletteOptionAtIndex(options: PaletteOption[], index: number) {
  return index < 0 ? undefined : options[index];
}

import { randIntFromInterval } from '@/utils/random';

export const MAX_TOKEN_LENGTH = 512;
export const TOKEN_SYMBOLS = '.,;:!?/-"\'#{}()[]|\\@=*+';

export function createToken({
  withUppercase = true,
  withLowercase = true,
  withNumbers = true,
  withSymbols = false,
  length = 64,
  alphabet,
}: {
  withUppercase?: boolean
  withLowercase?: boolean
  withNumbers?: boolean
  withSymbols?: boolean
  length?: number
  alphabet?: string
}) {
  if (!Number.isSafeInteger(length) || length < 0 || length > MAX_TOKEN_LENGTH) {
    throw new RangeError(`Token length must be an integer between 0 and ${MAX_TOKEN_LENGTH}`);
  }

  const allAlphabet = alphabet ?? [
    withUppercase ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' : '',
    withLowercase ? 'abcdefghijklmnopqrstuvwxyz' : '',
    withNumbers ? '0123456789' : '',
    withSymbols ? TOKEN_SYMBOLS : '',
  ].join('');

  // Duplicate alphabet entries would give those characters extra probability.
  const characters = Array.from(new Set(allAlphabet));
  if (characters.length === 0) {
    return '';
  }

  return Array.from(
    { length },
    () => characters[randIntFromInterval(0, characters.length)],
  ).join('');
}

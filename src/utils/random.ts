const UINT32_RANGE = 0x1_0000_0000;

function randomUint32() {
  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  return values[0];
}

function random() {
  return randomUint32() / UINT32_RANGE;
}

function randFromArray<T>(array: T[]): T | undefined {
  return array.length === 0 ? undefined : array[randIntFromInterval(0, array.length)];
}

function randIntFromInterval(min: number, max: number) {
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || max <= min) {
    throw new RangeError('min and max must be safe integers and max must be greater than min');
  }

  const range = max - min;
  if (range > UINT32_RANGE) {
    throw new RangeError('The requested interval must not contain more than 2^32 values');
  }

  // Discard the incomplete tail so every value has the same probability.
  const unbiasedLimit = Math.floor(UINT32_RANGE / range) * range;
  let value: number;
  do {
    value = randomUint32();
  } while (value >= unbiasedLimit);

  return min + (value % range);
}

// Durstenfeld shuffle
function shuffleArrayMutate<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = randIntFromInterval(0, i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}

const shuffleArray = <T>(array: T[]): T[] => shuffleArrayMutate([...array]);

const shuffleString = (str: string, delimiter = ''): string => shuffleArrayMutate(str.split(delimiter)).join(delimiter);

function generateRandomId() {
  const randomBytes = new Uint8Array(10);
  globalThis.crypto.getRandomValues(randomBytes);
  return `id-${Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

export {
  randFromArray,
  randIntFromInterval,
  random,
  shuffleArray,
  shuffleArrayMutate,
  shuffleString,
  generateRandomId,
};

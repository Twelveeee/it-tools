import RandExp from 'randexp';
import { matchRegex } from './regex-tester.service';

export const MAX_REGEX_LENGTH = 1_000;
export const MAX_TEXT_LENGTH = 100_000;

const workerScope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<{ regex: string; text: string; flags: string }>) => void) | null
  postMessage: (message: unknown) => void
};

workerScope.onmessage = ({ data }) => {
  try {
    if (data.regex.length > MAX_REGEX_LENGTH) {
      throw new Error(`Regular expressions are limited to ${MAX_REGEX_LENGTH} characters.`);
    }
    if (data.text.length > MAX_TEXT_LENGTH) {
      throw new Error(`Input text is limited to ${MAX_TEXT_LENGTH.toLocaleString()} characters.`);
    }

    const results = matchRegex(data.regex, data.text, data.flags);
    const sampleExpression = new RegExp(data.regex.replace(/\(\?\<[^\>]*\>/g, '(?:'));
    const generator = new RandExp(sampleExpression);
    generator.max = 100;
    const sample = generator.gen().slice(0, 2_000);
    workerScope.postMessage({ results, sample });
  }
  catch (error) {
    workerScope.postMessage({ error: error instanceof Error ? error.message : 'Regular expression failed.' });
  }
};

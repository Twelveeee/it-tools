import type { RuntimeTokenizer, TokenizationResult, TokenizerModelDefinition, TokenizerSegment, TokenizerToken } from './tokenizer.models';
import { MAX_TOKENIZER_INPUT_LENGTH } from './tokenizer.models';
import { tokenizerModels } from './tokenizer.registry';

const openAISpecialTokens = {
  '<|im_start|>': 200264,
  '<|im_end|>': 200265,
  '<|im_sep|>': 200266,
};

const tokenizerCache = new Map<string, Promise<RuntimeTokenizer>>();
const tokenizerFetchTimeoutMs = 20_000;

const Segmenter = (globalThis.Intl as typeof Intl & { Segmenter?: new (locales?: string | string[], options?: { granularity: string }) => { segment: (input: string) => ArrayLike<{ segment: string }> } })?.Segmenter;
const graphemeSegmenter = Segmenter
  ? new Segmenter(undefined, { granularity: 'grapheme' })
  : null;

function splitGraphemes(value: string) {
  if (!graphemeSegmenter) {
    return Array.from(value);
  }

  return Array.from(graphemeSegmenter.segment(value), ({ segment }) => segment);
}

export function buildHuggingFaceAssetUrl(modelId: string, assetName: 'tokenizer.json' | 'tokenizer_config.json') {
  return `https://huggingface.co/${modelId}/resolve/main/${assetName}`;
}

export function assertTokenizerInputLength(serializedInput: string) {
  if (serializedInput.length > MAX_TOKENIZER_INPUT_LENGTH) {
    throw new RangeError(`Tokenizer input is limited to ${MAX_TOKENIZER_INPUT_LENGTH.toLocaleString()} characters.`);
  }
}

export async function fetchHuggingFaceTokenizerAssets(fetcher: typeof fetch, modelId: string) {
  const abortController = new AbortController();
  const timeoutId = globalThis.setTimeout(() => abortController.abort(), tokenizerFetchTimeoutMs);
  const requestOptions: RequestInit = {
    cache: 'force-cache',
    credentials: 'omit',
    signal: abortController.signal,
  };

  try {
    const [tokenizerResponse, configResponse] = await Promise.all([
      fetcher(buildHuggingFaceAssetUrl(modelId, 'tokenizer.json'), requestOptions),
      fetcher(buildHuggingFaceAssetUrl(modelId, 'tokenizer_config.json'), requestOptions),
    ]);

    if (!tokenizerResponse.ok || !configResponse.ok) {
      throw new Error(`Failed to load tokenizer assets for ${modelId}.`);
    }

    const [tokenizerJson, tokenizerConfig] = await Promise.all([
      tokenizerResponse.json(),
      configResponse.json(),
    ]);

    return { tokenizerJson, tokenizerConfig };
  }
  finally {
    globalThis.clearTimeout(timeoutId);
  }
}

export async function createOpenAITokenizer(): Promise<RuntimeTokenizer> {
  const [{ Tiktoken }, { default: ranks }] = await Promise.all([
    import('js-tiktoken/lite'),
    import('js-tiktoken/ranks/o200k_base'),
  ]);
  const tokenizer = new Tiktoken(ranks, openAISpecialTokens);

  return {
    encode: text => tokenizer.encode(text, 'all'),
    decode: tokenIds => tokenizer.decode(tokenIds),
  };
}

export async function createQwenTokenizer(modelId: string): Promise<RuntimeTokenizer> {
  const [{ Tokenizer: HuggingFaceTokenizer }, { tokenizerJson, tokenizerConfig }] = await Promise.all([
    import('@huggingface/tokenizers'),
    fetchHuggingFaceTokenizerAssets(fetch, modelId),
  ]);
  const tokenizer = new HuggingFaceTokenizer(tokenizerJson, tokenizerConfig);

  return {
    encode: text => tokenizer.encode(text, { add_special_tokens: false }).ids,
    decode: tokenIds => tokenizer.decode(tokenIds, { skip_special_tokens: false, clean_up_tokenization_spaces: false }),
  };
}

function createSegmentAccumulator(tokens: number[], inputText: string, decode: RuntimeTokenizer['decode']) {
  const remainingInput = splitGraphemes(inputText);
  const tokenEntries: TokenizerToken[] = tokens.map((id, idx) => ({ id, idx, segmentIndex: null }));
  const segments: TokenizerSegment[] = [];

  let inputGraphemes = remainingInput;
  let startTokenIdx = 0;
  let tokenBuffer: TokenizerToken[] = [];

  for (let idx = 0; idx < tokens.length; idx++) {
    tokenBuffer.push(tokenEntries[idx]);

    const previousText = decode(tokens.slice(0, startTokenIdx + 1));
    const currentText = decode(tokens.slice(0, idx + 1));
    const segmentText = previousText === currentText ? currentText : currentText.slice(previousText.length);

    if (!segmentText) {
      continue;
    }

    const segmentGraphemes = splitGraphemes(segmentText);
    if (!segmentGraphemes.every((grapheme, graphemeIdx) => inputGraphemes[graphemeIdx] === grapheme)) {
      continue;
    }

    const segmentIndex = segments.length;
    tokenBuffer.forEach((token) => {
      token.segmentIndex = segmentIndex;
    });

    segments.push({
      text: segmentText,
      tokens: [...tokenBuffer],
    });

    tokenBuffer = [];
    startTokenIdx = idx;
    inputGraphemes = inputGraphemes.slice(segmentGraphemes.length);
  }

  return { segments, tokenEntries };
}

export function tokenizeText(runtimeTokenizer: RuntimeTokenizer, serializedInput: string): TokenizationResult {
  assertTokenizerInputLength(serializedInput);
  const tokenIds = runtimeTokenizer.encode(serializedInput);
  const { segments, tokenEntries } = createSegmentAccumulator(tokenIds, serializedInput, runtimeTokenizer.decode);

  return {
    count: tokenIds.length,
    serializedInput,
    segments,
    tokens: tokenEntries,
  };
}

export const tokenizerRegistry: TokenizerModelDefinition[] = tokenizerModels.map(definition => ({
  ...definition,
  loader: definition.family === 'openai'
    ? createOpenAITokenizer
    : async () => createQwenTokenizer(definition.id),
}));

export function getTokenizerDefinition(modelId: string) {
  const definition = tokenizerRegistry.find(({ id }) => id === modelId);

  if (!definition) {
    throw new Error(`Unknown tokenizer model: ${modelId}`);
  }

  return definition;
}

export async function loadTokenizer(modelId: string) {
  const definition = getTokenizerDefinition(modelId);
  const cacheKey = definition.family === 'openai' ? 'openai:o200k_base' : modelId;

  if (!tokenizerCache.has(cacheKey)) {
    const tokenizerPromise = definition.loader().catch((error) => {
      tokenizerCache.delete(cacheKey);
      throw error;
    });
    tokenizerCache.set(cacheKey, tokenizerPromise);
  }

  return tokenizerCache.get(cacheKey)!;
}

import { serializeDeepSeekChat, serializeOpenAIChat, serializeQwen3Chat, serializeQwen35Chat } from './tokenizer.serializers';
import type { RuntimeTokenizer, TokenizationResult, TokenizerModelDefinition, TokenizerSegment, TokenizerToken } from './tokenizer.models';

const openAISpecialTokens = {
  '<|im_start|>': 200264,
  '<|im_end|>': 200265,
  '<|im_sep|>': 200266,
};

const tokenizerCache = new Map<string, Promise<RuntimeTokenizer>>();

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

export function encodeWhitespace(value: string) {
  return value
    .split(' ').join('⋅')
    .split('\t').join('→')
    .split('\f').join('\\f\f')
    .split('\b').join('\\b\b')
    .split('\v').join('\\v\v')
    .split('\r').join('\\r\r')
    .split('\n').join('\\n\n')
    .split('\\r\r\\n\n').join('\\r\\n\r\n');
}

export function buildHuggingFaceAssetUrl(modelId: string, assetName: 'tokenizer.json' | 'tokenizer_config.json') {
  return `https://huggingface.co/${modelId}/resolve/main/${assetName}`;
}

export function buildOpenAIEncodingUrl(encodingName: 'o200k_base') {
  return `https://tiktoken.pages.dev/js/${encodingName}.json`;
}

export async function fetchHuggingFaceTokenizerAssets(fetcher: typeof fetch, modelId: string) {
  const [tokenizerResponse, configResponse] = await Promise.all([
    fetcher(buildHuggingFaceAssetUrl(modelId, 'tokenizer.json')),
    fetcher(buildHuggingFaceAssetUrl(modelId, 'tokenizer_config.json')),
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

export async function createOpenAITokenizer(): Promise<RuntimeTokenizer> {
  const [{ Tiktoken }, response] = await Promise.all([
    import('js-tiktoken/lite'),
    fetch(buildOpenAIEncodingUrl('o200k_base')),
  ]);

  if (!response.ok) {
    throw new Error('Failed to load OpenAI tokenizer ranks.');
  }

  const ranks = await response.json();
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
  const tokenIds = runtimeTokenizer.encode(serializedInput);
  const { segments, tokenEntries } = createSegmentAccumulator(tokenIds, serializedInput, runtimeTokenizer.decode);

  return {
    count: tokenIds.length,
    serializedInput,
    segments,
    tokens: tokenEntries,
  };
}

export const tokenizerRegistry: TokenizerModelDefinition[] = [
  {
    id: 'gpt-5.4',
    label: 'GPT-5.4',
    family: 'openai',
    group: 'OpenAI',
    supportsThinking: false,
    supportedModes: ['text', 'chat'],
    loader: createOpenAITokenizer,
    serializer: serializeOpenAIChat,
  },
  {
    id: 'gpt-5.4-mini',
    label: 'GPT-5.4 Mini',
    family: 'openai',
    group: 'OpenAI',
    supportsThinking: false,
    supportedModes: ['text', 'chat'],
    loader: createOpenAITokenizer,
    serializer: serializeOpenAIChat,
  },
  {
    id: 'gpt-5.4-nano',
    label: 'GPT-5.4 Nano',
    family: 'openai',
    group: 'OpenAI',
    supportsThinking: false,
    supportedModes: ['text', 'chat'],
    loader: createOpenAITokenizer,
    serializer: serializeOpenAIChat,
  },
  {
    id: 'Qwen/Qwen3-8B',
    label: 'Qwen 3',
    family: 'qwen3',
    group: 'Qwen',
    supportsThinking: true,
    supportedModes: ['text', 'chat'],
    loader: async () => createQwenTokenizer('Qwen/Qwen3-8B'),
    serializer: serializeQwen3Chat,
  },
  {
    id: 'Qwen/Qwen3.5-9B',
    label: 'Qwen 3.5',
    family: 'qwen3_5',
    group: 'Qwen',
    supportsThinking: true,
    supportedModes: ['text', 'chat'],
    loader: async () => createQwenTokenizer('Qwen/Qwen3.5-9B'),
    serializer: serializeQwen35Chat,
  },
  {
    id: 'deepseek-ai/DeepSeek-R1',
    label: 'DeepSeek',
    family: 'deepseek',
    group: 'DeepSeek',
    supportsThinking: true,
    supportedModes: ['text', 'chat'],
    loader: async () => createQwenTokenizer('deepseek-ai/DeepSeek-R1'),
    serializer: serializeDeepSeekChat,
  },
];

export function getTokenizerDefinition(modelId: string) {
  const definition = tokenizerRegistry.find(({ id }) => id === modelId);

  if (!definition) {
    throw new Error(`Unknown tokenizer model: ${modelId}`);
  }

  return definition;
}

export async function loadTokenizer(modelId: string) {
  if (!tokenizerCache.has(modelId)) {
    tokenizerCache.set(modelId, getTokenizerDefinition(modelId).loader());
  }

  return tokenizerCache.get(modelId)!;
}

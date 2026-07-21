import { serializeDeepSeekChat, serializeOpenAIChat, serializeQwen35Chat, serializeQwen3Chat } from './tokenizer.serializers';
import type { TokenizerModelMetadata } from './tokenizer.models';

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

export const tokenizerModels: TokenizerModelMetadata[] = [
  {
    id: 'gpt-5.4',
    label: 'GPT-5.4',
    family: 'openai',
    group: 'OpenAI',
    supportsThinking: false,
    supportedModes: ['text', 'chat'],
    serializer: serializeOpenAIChat,
  },
  {
    id: 'gpt-5.4-mini',
    label: 'GPT-5.4 Mini',
    family: 'openai',
    group: 'OpenAI',
    supportsThinking: false,
    supportedModes: ['text', 'chat'],
    serializer: serializeOpenAIChat,
  },
  {
    id: 'gpt-5.4-nano',
    label: 'GPT-5.4 Nano',
    family: 'openai',
    group: 'OpenAI',
    supportsThinking: false,
    supportedModes: ['text', 'chat'],
    serializer: serializeOpenAIChat,
  },
  {
    id: 'Qwen/Qwen3-8B',
    label: 'Qwen 3',
    family: 'qwen3',
    group: 'Qwen',
    supportsThinking: true,
    supportedModes: ['text', 'chat'],
    serializer: serializeQwen3Chat,
  },
  {
    id: 'Qwen/Qwen3.5-9B',
    label: 'Qwen 3.5',
    family: 'qwen3_5',
    group: 'Qwen',
    supportsThinking: true,
    supportedModes: ['text', 'chat'],
    serializer: serializeQwen35Chat,
  },
  {
    id: 'deepseek-ai/DeepSeek-R1',
    label: 'DeepSeek',
    family: 'deepseek',
    group: 'DeepSeek',
    supportsThinking: true,
    supportedModes: ['text', 'chat'],
    serializer: serializeDeepSeekChat,
  },
];

export function getTokenizerModel(modelId: string) {
  const definition = tokenizerModels.find(({ id }) => id === modelId);

  if (!definition) {
    throw new Error(`Unknown tokenizer model: ${modelId}`);
  }

  return definition;
}

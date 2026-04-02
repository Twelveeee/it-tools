export type TokenizerFamily = 'openai' | 'qwen3' | 'qwen3_5' | 'deepseek';
export type TokenizerInputMode = 'text' | 'chat';
export type ChatMessageRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatMessageRole
  content: string
}

export interface SerializeChatOptions {
  addGenerationPrompt?: boolean
  enableThinking?: boolean
}

export interface TokenizerToken {
  id: number
  idx: number
  segmentIndex: number | null
}

export interface TokenizerSegment {
  text: string
  tokens: TokenizerToken[]
}

export interface TokenizationResult {
  count: number
  segments: TokenizerSegment[]
  serializedInput: string
  tokens: TokenizerToken[]
}

export interface RuntimeTokenizer {
  encode: (text: string) => number[]
  decode: (tokenIds: number[]) => string
}

export interface TokenizerModelDefinition {
  id: string
  label: string
  family: TokenizerFamily
  group: string
  supportsThinking: boolean
  supportedModes: TokenizerInputMode[]
  loader: () => Promise<RuntimeTokenizer>
  serializer: (messages: ChatMessage[], options?: SerializeChatOptions) => string
}

export const defaultTokenizerModelId = 'gpt-5.4';

export function createDefaultChatMessages(): ChatMessage[] {
  return [
    { role: 'system', content: 'You are a helpful assistant' },
    { role: 'user', content: '' },
  ];
}

export function createNewChatMessage(role: ChatMessageRole = 'user'): ChatMessage {
  return { role, content: '' };
}

import { describe, expect, it } from 'vitest';
import { serializeDeepSeekChat, serializeOpenAIChat, serializeQwen3Chat, serializeQwen35Chat } from './tokenizer.serializers';
import type { ChatMessage } from './tokenizer.models';

const chatMessages: ChatMessage[] = [
  { role: 'system', content: 'You are helpful.' },
  { role: 'user', content: 'Hello' },
];

describe('tokenizer serializers', () => {
  it('serializes OpenAI chat messages with im separators', () => {
    expect(serializeOpenAIChat(chatMessages)).toEqual('<|im_start|>system<|im_sep|>You are helpful.<|im_end|><|im_start|>user<|im_sep|>Hello<|im_end|><|im_start|>assistant<|im_sep|>');
  });

  it('serializes Qwen3 chat messages with generation prompt', () => {
    expect(serializeQwen3Chat(chatMessages, { addGenerationPrompt: true, enableThinking: true })).toContain('<|im_start|>assistant\n<think>\n');
  });

  it('serializes Qwen3.5 chat messages with generation prompt', () => {
    expect(serializeQwen35Chat(chatMessages, { addGenerationPrompt: true, enableThinking: false })).toContain('<think>\n\n</think>\n\n');
  });

  it('rejects Qwen3.5 chats with a non-leading system message', () => {
    expect(() => serializeQwen35Chat([
      { role: 'user', content: 'Hello' },
      { role: 'system', content: 'Nope' },
    ])).toThrow('Qwen3.5 chat supports a single leading system message only.');
  });

  it('serializes DeepSeek chat messages with think generation prompt', () => {
    expect(serializeDeepSeekChat(chatMessages, { addGenerationPrompt: true })).toContain('<｜Assistant｜><think>\n');
    expect(serializeDeepSeekChat(chatMessages, { addGenerationPrompt: true })).toContain('<｜begin▁of▁sentence｜>');
  });
});

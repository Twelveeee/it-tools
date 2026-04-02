import type { ChatMessage, SerializeChatOptions } from './tokenizer.models';

function getMessageContent(message: ChatMessage) {
  return message.content ?? '';
}

function getLastUserIndex(messages: ChatMessage[]) {
  for (let index = messages.length - 1; index >= 0; index--) {
    if (messages[index]?.role === 'user') {
      return index;
    }
  }

  return -1;
}

function renderAssistantContent(content: string, shouldWrapThinking: boolean) {
  if (!shouldWrapThinking) {
    return content;
  }

  return `<think>\n\n</think>\n\n${content}`;
}

export function serializeOpenAIChat(messages: ChatMessage[]) {
  return [
    messages.map(({ role, content }) => `<|im_start|>${role}<|im_sep|>${getMessageContent({ role, content })}<|im_end|>`).join(''),
    '<|im_start|>assistant<|im_sep|>',
  ].join('');
}

export function serializeQwen3Chat(messages: ChatMessage[], options: SerializeChatOptions = {}) {
  const { addGenerationPrompt = true, enableThinking = true } = options;
  const lastUserIndex = getLastUserIndex(messages);

  const serializedMessages = messages.map((message, index) => {
    if (message.role === 'assistant') {
      const content = renderAssistantContent(getMessageContent(message), index > lastUserIndex);
      return `<|im_start|>assistant\n${content}<|im_end|>\n`;
    }

    return `<|im_start|>${message.role}\n${getMessageContent(message)}<|im_end|>\n`;
  }).join('');

  if (!addGenerationPrompt) {
    return serializedMessages;
  }

  return `${serializedMessages}<|im_start|>assistant\n${enableThinking ? '<think>\n' : '<think>\n\n</think>\n\n'}`;
}

export function serializeQwen35Chat(messages: ChatMessage[], options: SerializeChatOptions = {}) {
  const { addGenerationPrompt = true, enableThinking = true } = options;
  const systemMessages = messages.filter(({ role }) => role === 'system');

  if (systemMessages.length > 1 || (systemMessages[0] && messages[0]?.role !== 'system')) {
    throw new Error('Qwen3.5 chat supports a single leading system message only.');
  }

  const lastUserIndex = getLastUserIndex(messages);
  const serializedMessages = messages.map((message, index) => {
    if (message.role === 'assistant') {
      const content = renderAssistantContent(getMessageContent(message), index > lastUserIndex);
      return `<|im_start|>assistant\n${content}<|im_end|>\n`;
    }

    return `<|im_start|>${message.role}\n${getMessageContent(message)}<|im_end|>\n`;
  }).join('');

  if (!addGenerationPrompt) {
    return serializedMessages;
  }

  return `${serializedMessages}<|im_start|>assistant\n${enableThinking ? '<think>\n' : '<think>\n\n</think>\n\n'}`;
}

export function serializeDeepSeekChat(messages: ChatMessage[], options: SerializeChatOptions = {}) {
  const { addGenerationPrompt = true } = options;
  const systemPrompts: string[] = [];
  const serializedMessages: string[] = [];

  for (const message of messages) {
    if (message.role === 'system') {
      systemPrompts.push(getMessageContent(message));
      continue;
    }

    if (message.role === 'user') {
      serializedMessages.push(`<｜User｜>${getMessageContent(message)}`);
      continue;
    }

    let content = getMessageContent(message);
    if (content.includes('</think>')) {
      content = content.split('</think>').slice(-1)[0] ?? '';
    }

    serializedMessages.push(`<｜Assistant｜>${content}<｜end▁of▁sentence｜>`);
  }

  const serializedSystemPrompt = systemPrompts.join('\n\n');
  const generationPrompt = addGenerationPrompt ? '<｜Assistant｜><think>\n' : '';

  return `<｜begin▁of▁sentence｜>${serializedSystemPrompt}${serializedMessages.join('')}${generationPrompt}`;
}

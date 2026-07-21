import { describe, expect, it, vi } from 'vitest';
import { buildHuggingFaceAssetUrl, fetchHuggingFaceTokenizerAssets, getTokenizerDefinition, tokenizeText } from './tokenizer.service';
import { MAX_TOKENIZER_INPUT_LENGTH } from './tokenizer.models';

describe('tokenizer service', () => {
  it('maps GPT-5.4 aliases to the OpenAI tokenizer family', () => {
    expect(getTokenizerDefinition('gpt-5.4').family).toEqual('openai');
    expect(getTokenizerDefinition('gpt-5.4-mini').family).toEqual('openai');
    expect(getTokenizerDefinition('gpt-5.4-nano').family).toEqual('openai');
    expect(getTokenizerDefinition('Qwen/Qwen3-8B').label).toEqual('Qwen 3');
    expect(getTokenizerDefinition('Qwen/Qwen3.5-9B').label).toEqual('Qwen 3.5');
    expect(getTokenizerDefinition('deepseek-ai/DeepSeek-R1').family).toEqual('deepseek');
  });

  it('builds Hugging Face resolve URLs for tokenizer assets', () => {
    expect(buildHuggingFaceAssetUrl('Qwen/Qwen3-8B', 'tokenizer.json')).toEqual('https://huggingface.co/Qwen/Qwen3-8B/resolve/main/tokenizer.json');
    expect(buildHuggingFaceAssetUrl('Qwen/Qwen3.5-9B', 'tokenizer_config.json')).toEqual('https://huggingface.co/Qwen/Qwen3.5-9B/resolve/main/tokenizer_config.json');
  });

  it('fetches both Hugging Face assets via resolve URLs', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ tokenizer: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ config: true }) });

    await fetchHuggingFaceTokenizerAssets(fetcher as unknown as typeof fetch, 'Qwen/Qwen3-8B');

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      'https://huggingface.co/Qwen/Qwen3-8B/resolve/main/tokenizer.json',
      expect.objectContaining({ cache: 'force-cache', credentials: 'omit' }),
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      'https://huggingface.co/Qwen/Qwen3-8B/resolve/main/tokenizer_config.json',
      expect.objectContaining({ cache: 'force-cache', credentials: 'omit' }),
    );
  });

  it('reconstructs text segments without breaking emoji or CJK graphemes', () => {
    const decodeMap: Record<string, string> = {
      '1': 'Hello',
      '1,2': 'Hello🙂',
      '1,2,3': 'Hello🙂世界\n',
    };

    const result = tokenizeText({
      encode: () => [1, 2, 3],
      decode: tokenIds => decodeMap[tokenIds.join(',')] ?? '',
    }, 'Hello🙂世界\n');

    expect(result.count).toBeGreaterThan(0);
    expect(result.segments.map(({ text }) => text).join('')).toEqual('Hello🙂世界\n');
    expect(result.tokens).toHaveLength(result.count);
  });

  it('rejects oversized input before encoding it', () => {
    const encode = vi.fn(() => []);

    expect(() => tokenizeText({
      encode,
      decode: () => '',
    }, 'a'.repeat(MAX_TOKENIZER_INPUT_LENGTH + 1))).toThrow(/limited to 50,000 characters/);
    expect(encode).not.toHaveBeenCalled();
  });
});

import { assertTokenizerInputLength, loadTokenizer, tokenizeText } from './tokenizer.service';
import type { TokenizerWorkerRequest, TokenizerWorkerResponse } from './tokenizer.models';

interface WorkerScope {
  onmessage: ((event: MessageEvent<TokenizerWorkerRequest>) => void) | null
  postMessage: (message: TokenizerWorkerResponse) => void
}

const workerScope = globalThis as unknown as WorkerScope;

workerScope.onmessage = async ({ data: { id, modelId, serializedInput } }) => {
  try {
    assertTokenizerInputLength(serializedInput);
    const tokenizer = await loadTokenizer(modelId);
    workerScope.postMessage({
      id,
      result: tokenizeText(tokenizer, serializedInput),
    });
  }
  catch (error) {
    workerScope.postMessage({
      error: error instanceof Error ? error.message : 'Unable to tokenize this input.',
      id,
    });
  }
};

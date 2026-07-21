import { compare, hash } from 'bcryptjs';

type BcryptRequest =
  | { action: 'hash'; value: string; rounds: number }
  | { action: 'compare'; value: string; hash: string };

const workerScope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<BcryptRequest>) => void) | null
  postMessage: (message: unknown) => void
};

workerScope.onmessage = async ({ data }) => {
  try {
    if (data.action === 'hash') {
      const rounds = Math.min(16, Math.max(4, Math.trunc(data.rounds)));
      workerScope.postMessage({ result: await hash(data.value, rounds) });
      return;
    }

    const encodedRounds = Number(data.hash.match(/^\$2[abxy]?\$(\d{2})\$/)?.[1]);
    if (!Number.isFinite(encodedRounds) || encodedRounds > 16) {
      throw new Error('Only valid bcrypt hashes with a cost of 16 or less are accepted.');
    }

    workerScope.postMessage({ result: await compare(data.value, data.hash) });
  }
  catch (error) {
    workerScope.postMessage({ error: error instanceof Error ? error.message : 'bcrypt operation failed' });
  }
};

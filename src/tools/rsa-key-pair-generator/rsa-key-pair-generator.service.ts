import { pki } from 'node-forge';
import workerScript from 'node-forge/dist/prime.worker.min?url';

export const MIN_RSA_BITS = 2048;
export const DEFAULT_RSA_BITS = 3072;
export const MAX_RSA_BITS = 16384;

export { generateKeyPair, validateRsaBits };

function validateRsaBits(bits: number) {
  if (!Number.isSafeInteger(bits) || bits < MIN_RSA_BITS || bits > MAX_RSA_BITS || bits % 8 !== 0) {
    throw new RangeError(
      `RSA key size must be a multiple of 8 between ${MIN_RSA_BITS} and ${MAX_RSA_BITS} bits`,
    );
  }
}

function generateRawPairs({ bits = DEFAULT_RSA_BITS }) {
  validateRsaBits(bits);

  return new Promise<pki.rsa.KeyPair>((resolve, reject) =>
    pki.rsa.generateKeyPair({ bits, workerScript }, (err, keyPair) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(keyPair);
    }),
  );
}

async function generateKeyPair(config: { bits?: number } = {}) {
  const { privateKey, publicKey } = await generateRawPairs(config);

  return {
    publicKeyPem: pki.publicKeyToPem(publicKey),
    privateKeyPem: pki.privateKeyToPem(privateKey),
  };
}

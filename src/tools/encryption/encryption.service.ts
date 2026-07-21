export const ENCRYPTION_ENVELOPE_PREFIX = 'it-tools-aes-gcm-v1';
export const PBKDF2_ITERATIONS = 310_000;

const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function assertPassword(password: string) {
  if (password.length === 0) {
    throw new Error('A password is required');
  }
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  const chunkSize = 0x8000;

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }

  return globalThis.btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = globalThis.atob(value);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

async function deriveEncryptionKey(password: string, salt: Uint8Array<ArrayBuffer>, keyUsages: KeyUsage[]) {
  const passwordKey = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return globalThis.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt,
      iterations: PBKDF2_ITERATIONS,
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    keyUsages,
  );
}

export async function encryptText({ plaintext, password }: { plaintext: string; password: string }) {
  assertPassword(password);

  const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveEncryptionKey(password, salt, ['encrypt']);
  const additionalData = new TextEncoder().encode(ENCRYPTION_ENVELOPE_PREFIX);
  const encrypted = await globalThis.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData, tagLength: AUTH_TAG_LENGTH * 8 },
    key,
    new TextEncoder().encode(plaintext),
  );

  return [
    ENCRYPTION_ENVELOPE_PREFIX,
    bytesToBase64(salt),
    bytesToBase64(iv),
    bytesToBase64(new Uint8Array(encrypted)),
  ].join('.');
}

export async function decryptText({ envelope, password }: { envelope: string; password: string }) {
  assertPassword(password);

  const parts = envelope.trim().split('.');
  if (parts.length !== 4 || parts[0] !== ENCRYPTION_ENVELOPE_PREFIX) {
    throw new Error('Unsupported or malformed encrypted text');
  }

  let salt: Uint8Array<ArrayBuffer>;
  let iv: Uint8Array<ArrayBuffer>;
  let encrypted: Uint8Array<ArrayBuffer>;
  try {
    salt = base64ToBytes(parts[1]);
    iv = base64ToBytes(parts[2]);
    encrypted = base64ToBytes(parts[3]);
  }
  catch {
    throw new Error('Unsupported or malformed encrypted text');
  }

  if (salt.length !== SALT_LENGTH || iv.length !== IV_LENGTH || encrypted.length < AUTH_TAG_LENGTH) {
    throw new Error('Unsupported or malformed encrypted text');
  }

  const key = await deriveEncryptionKey(password, salt, ['decrypt']);
  const additionalData = new TextEncoder().encode(ENCRYPTION_ENVELOPE_PREFIX);
  const decrypted = await globalThis.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, additionalData, tagLength: AUTH_TAG_LENGTH * 8 },
    key,
    encrypted,
  );

  return new TextDecoder('utf-8', { fatal: true }).decode(decrypted);
}

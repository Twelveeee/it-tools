<script setup lang="ts">
import { decryptText, encryptText } from './encryption.service';

const cypherInput = ref('Lorem ipsum dolor sit amet');
const cypherSecret = ref('');
const cypherOutput = ref('');
const cypherError = ref('');
const isEncrypting = ref(false);

const decryptInput = ref('');
const decryptSecret = ref('');
const decryptOutput = ref('');
const decryptError = ref('');
const isDecrypting = ref(false);

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

async function encrypt() {
  isEncrypting.value = true;
  cypherError.value = '';

  try {
    cypherOutput.value = await encryptText({
      plaintext: cypherInput.value,
      password: cypherSecret.value,
    });
  }
  catch (error) {
    cypherOutput.value = '';
    cypherError.value = getErrorMessage(error, 'Unable to encrypt your text');
  }
  finally {
    isEncrypting.value = false;
  }
}

async function decrypt() {
  isDecrypting.value = true;
  decryptError.value = '';

  try {
    decryptOutput.value = await decryptText({
      envelope: decryptInput.value,
      password: decryptSecret.value,
    });
  }
  catch {
    decryptOutput.value = '';
    decryptError.value = 'Unable to decrypt: check the password and encrypted text';
  }
  finally {
    isDecrypting.value = false;
  }
}
</script>

<template>
  <c-alert title="Authenticated encryption" mb-4>
    Uses a versioned AES-256-GCM format with PBKDF2-SHA-256, a fresh random salt, and a fresh nonce.
    Legacy CryptoJS AES, TripleDES, RC4, and Rabbit ciphertexts are intentionally not accepted here.
  </c-alert>

  <c-card title="Encrypt">
    <div flex gap-3>
      <c-input-text
        v-model:value="cypherInput"
        label="Your text:"
        placeholder="The text to encrypt"
        rows="4"
        multiline autosize raw-text monospace flex-1
      />
      <div flex flex-1 flex-col gap-2>
        <c-input-text
          v-model:value="cypherSecret"
          label="Password:"
          placeholder="Enter a strong password"
          type="password"
          raw-text clearable
        />
        <div>Algorithm: AES-256-GCM</div>
        <c-button :disabled="isEncrypting" type="primary" @click="encrypt">
          {{ isEncrypting ? 'Encrypting…' : 'Encrypt' }}
        </c-button>
      </div>
    </div>
    <c-alert v-if="cypherError" mt-5 title="Encryption error">
      {{ cypherError }}
    </c-alert>
    <c-input-text
      label="Encrypted text:"
      :value="cypherOutput"
      rows="3"
      placeholder="The versioned encrypted text will appear here"
      multiline monospace readonly autosize mt-5
    />
  </c-card>

  <c-card title="Decrypt">
    <div flex gap-3>
      <c-input-text
        v-model:value="decryptInput"
        label="Your encrypted text:"
        placeholder="Paste an it-tools-aes-gcm-v1 envelope"
        rows="4"
        multiline raw-text monospace autosize flex-1
      />
      <div flex flex-1 flex-col gap-2>
        <c-input-text
          v-model:value="decryptSecret"
          label="Password:"
          placeholder="Enter the password"
          type="password"
          clearable raw-text
        />
        <div>Accepted format: it-tools-aes-gcm-v1</div>
        <c-button :disabled="isDecrypting" type="primary" @click="decrypt">
          {{ isDecrypting ? 'Decrypting…' : 'Decrypt' }}
        </c-button>
      </div>
    </div>
    <c-alert v-if="decryptError" mt-5 title="Decryption error">
      {{ decryptError }}
    </c-alert>
    <c-input-text
      v-else
      label="Decrypted text:"
      :value="decryptOutput"
      placeholder="The authenticated plaintext will appear here"
      rows="3"
      multiline monospace readonly autosize mt-5
    />
  </c-card>
</template>

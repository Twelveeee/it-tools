<script setup lang="ts">
import { useThemeVars } from 'naive-ui';
import { useCopy } from '@/composable/copy';

type BcryptRequest =
  | { action: 'hash'; value: string; rounds: number }
  | { action: 'compare'; value: string; hash: string };

const themeVars = useThemeVars();
const input = ref('');
const saltCount = ref(10);
const hashed = ref('');
const hashError = ref('');
const hashing = ref(false);
const compareString = ref('');
const compareHash = ref('');
const compareMatch = ref<boolean | null>(null);
const compareError = ref('');
const comparing = ref(false);
let activeWorker: Worker | undefined;
let cancelActiveTask: ((reason: Error) => void) | undefined;

const { copy } = useCopy({ source: hashed, text: 'Hashed string copied to the clipboard' });

function runBcryptTask<T>(request: BcryptRequest): Promise<T> {
  cancelActiveTask?.(new Error('The previous bcrypt operation was cancelled.'));
  const worker = new Worker(new URL('./bcrypt.worker.ts', import.meta.url), { type: 'module' });
  activeWorker = worker;

  return new Promise((resolve, reject) => {
    let settled = false;
    let timeout = 0;
    const cleanup = () => {
      window.clearTimeout(timeout);
      worker.terminate();
      if (activeWorker === worker) {
        activeWorker = undefined;
        cancelActiveTask = undefined;
      }
    };
    const fail = (error: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(error);
    };
    const succeed = (value: T) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve(value);
    };
    timeout = window.setTimeout(() => fail(new Error('The operation took too long and was stopped.')), 15_000);
    cancelActiveTask = fail;

    worker.onmessage = ({ data }: MessageEvent<{ result?: T; error?: string }>) => {
      if (data.error) {
        fail(new Error(data.error));
        return;
      }
      succeed(data.result as T);
    };
    worker.onerror = () => fail(new Error('bcrypt worker failed.'));
    worker.postMessage(request);
  });
}

async function generateHash() {
  hashing.value = true;
  hashError.value = '';
  try {
    hashed.value = await runBcryptTask<string>({ action: 'hash', value: input.value, rounds: saltCount.value });
  }
  catch (error) {
    hashError.value = error instanceof Error ? error.message : 'Unable to hash the string.';
  }
  finally {
    hashing.value = false;
  }
}

async function compareValues() {
  comparing.value = true;
  compareError.value = '';
  compareMatch.value = null;
  try {
    compareMatch.value = await runBcryptTask<boolean>({
      action: 'compare',
      value: compareString.value,
      hash: compareHash.value,
    });
  }
  catch (error) {
    compareError.value = error instanceof Error ? error.message : 'Unable to compare the values.';
  }
  finally {
    comparing.value = false;
  }
}

onBeforeUnmount(() => cancelActiveTask?.(new Error('bcrypt operation cancelled.')));
</script>

<template>
  <c-card title="Hash">
    <c-input-text
      v-model:value="input"
      placeholder="Your string to bcrypt..."
      raw-text
      label="Your string: "
      label-position="left"
      label-align="right"
      label-width="120px"
      mb-2
    />
    <n-form-item label="Cost factor: " label-placement="left" label-width="120">
      <n-input-number v-model:value="saltCount" placeholder="Cost factor..." :max="16" :min="4" w-full />
    </n-form-item>

    <c-alert v-if="hashError" type="error" mb-3>
      {{ hashError }}
    </c-alert>
    <c-input-text :value="hashed" readonly text-center placeholder="Generate a hash to see it here" />

    <div mt-5 flex justify-center gap-3>
      <c-button type="primary" :disabled="hashing" @click="generateHash">
        {{ hashing ? 'Hashing…' : 'Generate hash' }}
      </c-button>
      <c-button :disabled="!hashed" @click="copy()">
        Copy hash
      </c-button>
    </div>
  </c-card>

  <c-card title="Compare string with hash">
    <n-form label-width="120" @submit.prevent="compareValues">
      <n-form-item label="Your string: " label-placement="left">
        <c-input-text v-model:value="compareString" placeholder="Your string to compare..." raw-text />
      </n-form-item>
      <n-form-item label="Your hash: " label-placement="left">
        <c-input-text v-model:value="compareHash" placeholder="Your hash to compare..." raw-text />
      </n-form-item>
      <c-alert v-if="compareError" type="error" mb-3>
        {{ compareError }}
      </c-alert>
      <n-form-item v-if="compareMatch !== null" label="Do they match? " label-placement="left" :show-feedback="false">
        <div class="compare-result" :class="{ positive: compareMatch }" role="status">
          {{ compareMatch ? 'Yes' : 'No' }}
        </div>
      </n-form-item>
      <div flex justify-center>
        <c-button
          native-type="submit"
          type="primary"
          :disabled="comparing || !compareHash"
        >
          {{ comparing ? 'Comparing…' : 'Compare' }}
        </c-button>
      </div>
    </n-form>
  </c-card>
</template>

<style lang="less" scoped>
.compare-result {
  color: v-bind('themeVars.errorColor');

  &.positive {
    color: v-bind('themeVars.successColor');
  }
}
</style>

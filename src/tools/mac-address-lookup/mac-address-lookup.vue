<script setup lang="ts">
import { getVendorPrefix } from './mac-address-lookup.service';
import type { MacAddressLookupResponse } from './mac-address-lookup.service';
import { macAddressValidationRules } from '@/utils/macAddress';
import { useCopy } from '@/composable/copy';

const macAddress = ref('20:37:06:12:34:56');
const details = ref<string>();
const loading = ref(false);
const lookupError = ref('');
let lookupWorker: Worker | null = null;
let latestRequestId = 0;

function disposeLookupWorker(worker = lookupWorker) {
  if (!worker) {
    return;
  }

  if (lookupWorker === worker) {
    lookupWorker = null;
  }
  worker.terminate();
}

function getLookupWorker() {
  if (lookupWorker) {
    return lookupWorker;
  }

  const worker = new Worker(new URL('./mac-address-lookup.worker.ts', import.meta.url), { type: 'module' });
  lookupWorker = worker;
  worker.onmessage = ({ data }: MessageEvent<MacAddressLookupResponse>) => {
    if (lookupWorker !== worker || data.id !== latestRequestId) {
      return;
    }

    details.value = data.vendor;
    lookupError.value = '';
    loading.value = false;
  };
  worker.onerror = () => {
    if (lookupWorker !== worker) {
      return;
    }

    disposeLookupWorker(worker);
    details.value = undefined;
    lookupError.value = 'Unable to load the vendor database.';
    loading.value = false;
  };

  return worker;
}

watch(macAddress, (address, _previousAddress, onCleanup) => {
  const prefix = getVendorPrefix(address);
  const requestId = ++latestRequestId;
  details.value = undefined;
  lookupError.value = '';

  if (prefix.length !== 6) {
    loading.value = false;
    return;
  }

  loading.value = true;
  const timeoutId = window.setTimeout(() => {
    let worker: Worker | null = null;
    try {
      worker = getLookupWorker();
      worker.postMessage({ id: requestId, prefix });
    }
    catch (error) {
      disposeLookupWorker(worker);
      lookupError.value = error instanceof Error ? error.message : 'Unable to load the vendor database.';
      loading.value = false;
    }
  }, 150);

  onCleanup(() => window.clearTimeout(timeoutId));
}, { immediate: true });

onBeforeUnmount(() => {
  latestRequestId++;
  disposeLookupWorker();
});

const { copy } = useCopy({ source: () => details.value ?? '', text: 'Vendor info copied to the clipboard' });
</script>

<template>
  <div>
    <c-input-text
      v-model:value="macAddress"
      label="MAC address:"
      size="large"
      placeholder="Type a MAC address"
      clearable
      autocomplete="off"
      autocorrect="off"
      autocapitalize="off"
      spellcheck="false"
      :validation-rules="macAddressValidationRules"
      mb-5
    />

    <div mb-5px>
      Vendor info:
    </div>
    <c-card mb-5>
      <div v-if="loading" flex justify-center py-4>
        <n-spin size="small" />
      </div>

      <n-alert v-else-if="lookupError" type="error" :show-icon="false">
        {{ lookupError }}
      </n-alert>

      <div v-else-if="details">
        <div v-for="(detail, index) of details.split('\n')" :key="index">
          {{ detail }}
        </div>
      </div>

      <div v-else italic op-60>
        Unknown vendor for this address
      </div>
    </c-card>

    <div flex justify-center>
      <c-button :disabled="!details" @click="copy()">
        Copy vendor info
      </c-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  DEFAULT_RSA_BITS,
  MAX_RSA_BITS,
  MIN_RSA_BITS,
  generateKeyPair,
  validateRsaBits,
} from './rsa-key-pair-generator.service';
import TextareaCopyable from '@/components/TextareaCopyable.vue';
import { withDefaultOnErrorAsync } from '@/utils/defaults';
import { useValidation } from '@/composable/validation';
import { computedRefreshableAsync } from '@/composable/computedRefreshable';

const bits = ref(DEFAULT_RSA_BITS);
const emptyCerts = { publicKeyPem: '', privateKeyPem: '' };

const { attrs: bitsValidationAttrs } = useValidation({
  source: bits,
  rules: [
    {
      message: `Bits should be ${MIN_RSA_BITS} <= bits <= ${MAX_RSA_BITS} and be a multiple of 8`,
      validator: (value) => {
        try {
          validateRsaBits(value);
          return true;
        }
        catch {
          return false;
        }
      },
    },
  ],
});

const [certs, refreshCerts] = computedRefreshableAsync(
  () => withDefaultOnErrorAsync(() => generateKeyPair({ bits: bits.value }), emptyCerts),
  emptyCerts,
);
</script>

<template>
  <div style="flex: 0 0 100%">
    <div item-style="flex: 1 1 0" style="max-width: 600px" mx-auto flex gap-3>
      <n-form-item label="Bits :" v-bind="bitsValidationAttrs as any" label-placement="left" label-width="100">
        <n-input-number
          v-model:value="bits"
          :min="MIN_RSA_BITS"
          :max="MAX_RSA_BITS"
          step="8"
        />
      </n-form-item>

      <c-button @click="refreshCerts">
        Refresh key-pair
      </c-button>
    </div>
  </div>

  <div>
    <h3>Public key</h3>
    <TextareaCopyable :value="certs.publicKeyPem" />
  </div>

  <div>
    <h3>Private key</h3>
    <TextareaCopyable :value="certs.privateKeyPem" />
  </div>
</template>

<script setup lang="ts">
// eslint-disable-next-line import/order
import { formatPhpValue, parsePhpSerialized } from './php-unserialize.service';
import CInputText from '@/ui/c-input-text/c-input-text.vue';
import { useValidation } from '@/composable/validation';

const defaultInput = 'a:4:{s:4:"name";s:5:"Alice";s:5:"items";a:2:{i:0;s:3:"foo";i:1;s:3:"bar";}s:6:"active";b:1;s:4:"meta";a:1:{s:5:"count";i:2;}}';
const outputModeOptions = ['print_r', 'var_dump', 'var_export'] as const;
type PhpUnserializeMode = typeof outputModeOptions[number];

const inputElement = ref<InstanceType<typeof CInputText>>();

const rawPhpSerialized = useStorage('php-unserialize:input', defaultInput);
const outputMode = useStorage<PhpUnserializeMode>('php-unserialize:mode', 'print_r');

const parseResult = computed(() => {
  if (rawPhpSerialized.value.trim() === '') {
    return { ok: true as const, value: '' };
  }

  return parsePhpSerialized(rawPhpSerialized.value);
});

const validation = useValidation({
  source: rawPhpSerialized,
  rules: [
    {
      validator: () => parseResult.value.ok,
      message: '{0}',
      getErrorMessage: () => parseResult.value.ok ? '' : `Unable to unserialize input. ${parseResult.value.error}`,
    },
  ],
});

const output = computed(() => {
  if (rawPhpSerialized.value.trim() === '' || !parseResult.value.ok) {
    return '';
  }

  return formatPhpValue(parseResult.value.value, outputMode.value);
});
</script>

<template>
  <div important:flex-full important:flex-shrink-0 important:flex-grow-0>
    <div flex justify-center>
      <c-buttons-select
        v-model:value="outputMode"
        :options="outputModeOptions"
        label="Output format"
        label-width="110px"
      />
    </div>
  </div>

  <CInputText
    ref="inputElement"
    v-model:value="rawPhpSerialized"
    label="Your PHP serialized value"
    placeholder="Paste your PHP serialized value here..."
    rows="18"

    raw-text autosize autofocus multiline monospace
    test-id="input"
    :validation="validation"
  />

  <div overflow-auto>
    <div mb-5px>
      PHP output
    </div>
    <textarea-copyable
      :value="output"
      language="php"
      :follow-height-of="inputElement?.inputWrapperRef"
    />
  </div>
</template>

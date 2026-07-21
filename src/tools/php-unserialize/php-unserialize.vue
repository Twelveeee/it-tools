<script setup lang="ts">
import { formatPhpValue, parseJsonInput, parsePhpSerialized, serializePhpValue } from './php-unserialize.service';
import CInputText from '@/ui/c-input-text/c-input-text.vue';
import { useValidation } from '@/composable/validation';

const defaultInput = 'a:4:{s:4:"name";s:5:"Alice";s:5:"items";a:2:{i:0;s:3:"foo";i:1;s:3:"bar";}s:6:"active";b:1;s:4:"meta";a:1:{s:5:"count";i:2;}}';
const defaultJsonInput = `{
  "name": "Alice",
  "items": ["foo", "bar"],
  "active": true,
  "meta": {
    "count": 2
  }
}`;
const directionOptions = [
  { label: 'Unserialize', value: 'unserialize' },
  { label: 'Serialize', value: 'serialize' },
] as const;
const outputModeOptions = ['print_r', 'var_dump', 'var_export', 'json'] as const;
type PhpTransformDirection = typeof directionOptions[number]['value'];
type PhpUnserializeMode = typeof outputModeOptions[number];

const inputElement = ref<InstanceType<typeof CInputText>>();

const direction = useStorage<PhpTransformDirection>('php-unserialize:direction', 'unserialize');
const rawPhpSerialized = ref(defaultInput);
const rawJsonInput = ref(defaultJsonInput);
const outputMode = useStorage<PhpUnserializeMode>('php-unserialize:mode', 'print_r');

onMounted(() => {
  localStorage.removeItem('php-unserialize:input');
  localStorage.removeItem('php-unserialize:json-input');
});

const input = computed({
  get: () => direction.value === 'serialize' ? rawJsonInput.value : rawPhpSerialized.value,
  set: (value: string) => {
    if (direction.value === 'serialize') {
      rawJsonInput.value = value;
      return;
    }

    rawPhpSerialized.value = value;
  },
});

const parseResult = computed(() => {
  if (input.value.trim() === '') {
    return { ok: true as const, value: '' };
  }

  return direction.value === 'serialize'
    ? parseJsonInput(input.value)
    : parsePhpSerialized(input.value);
});

const validation = useValidation({
  source: input,
  rules: [
    {
      validator: () => parseResult.value.ok,
      message: '{0}',
      getErrorMessage: () => {
        if (parseResult.value.ok) {
          return '';
        }

        return direction.value === 'serialize'
          ? `Unable to parse JSON input. ${parseResult.value.error}`
          : `Unable to unserialize input. ${parseResult.value.error}`;
      },
    },
  ],
  watch: [direction],
});

const output = computed(() => {
  if (input.value.trim() === '' || !parseResult.value.ok) {
    return '';
  }

  if (direction.value === 'serialize') {
    return serializePhpValue(parseResult.value.value);
  }

  return formatPhpValue(parseResult.value.value, outputMode.value);
});

const inputLabel = computed(() => direction.value === 'serialize' ? 'Your JSON' : 'Your PHP serialized value');
const inputPlaceholder = computed(() => direction.value === 'serialize' ? 'Paste your JSON here...' : 'Paste your PHP serialized value here...');
const outputLabel = computed(() => direction.value === 'serialize' ? 'PHP serialized value' : 'PHP output');
const outputLanguage = computed(() => direction.value === 'serialize' || outputMode.value !== 'json' ? 'php' : 'json');
</script>

<template>
  <div important:flex-full important:flex-shrink-0 important:flex-grow-0>
    <div flex flex-col items-center gap-2>
      <div flex justify-center>
        <c-buttons-select
          v-model:value="direction"
          :options="directionOptions"
          label="Mode"
          label-width="110px"
        />
      </div>

      <div
        flex justify-center
        :aria-hidden="direction === 'serialize'"
        :style="{ visibility: direction === 'unserialize' ? 'visible' : 'hidden' }"
      >
        <c-buttons-select
          v-model:value="outputMode"
          :options="outputModeOptions"
          label="Output format"
          label-width="110px"
        />
      </div>
    </div>
  </div>

  <CInputText
    ref="inputElement"
    v-model:value="input"
    :label="inputLabel"
    :placeholder="inputPlaceholder"
    rows="18"

    raw-text autosize autofocus multiline monospace
    test-id="input"
    :validation="validation"
  />

  <div overflow-auto>
    <div mb-5px>
      {{ outputLabel }}
    </div>
    <textarea-copyable
      :value="output"
      :language="outputLanguage"
      :follow-height-of="inputElement?.inputWrapperRef"
    />
  </div>
</template>

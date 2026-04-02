<script setup lang="ts">
import CInputText from '@/ui/c-input-text/c-input-text.vue';
import { useCopy } from '@/composable/copy';

const input = useStorage(
  'mysql-in-query:input',
  ['1', '2', '3', '4'].join('\n'),
);

function escapeMysqlValue(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

function isQuotedValue(value: string) {
  return (
    value.length >= 2
    && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\'')))
  );
}

const output = computed(() =>
  input.value
    .split(/\r?\n/)
    .map(value => value.trim())
    .filter(Boolean)
    .map(value => isQuotedValue(value) ? value : `"${escapeMysqlValue(value)}"`)
    .join(','),
);

const { copy } = useCopy({ source: output, text: 'MySQL IN query values copied to the clipboard' });
</script>

<template>
  <div class="mysql-in-query-layout" grid grid-cols-1 items-stretch gap-16px xl:grid-cols-2>
    <c-card title="Input values" class="h-full">
      <CInputText
        v-model:value="input"
        multiline
        rows="22"
        autosize
        raw-text
        monospace
        placeholder="Paste your values here..."
      />
    </c-card>

    <c-card class="h-full flex flex-col">
      <div mb-5 flex items-center justify-between gap-4>
        <div class="output-title">
          MySQL IN query values
        </div>

        <c-button @click="copy()">
          Copy query values
        </c-button>
      </div>

      <div mb-4 flex-1>
        <CInputText
          :value="output"
          multiline
          rows="22"
          monospace
          raw-text
          readonly
          placeholder="Your quoted values will appear here..."
        />
      </div>
    </c-card>
  </div>
</template>

<style lang="less" scoped>
.mysql-in-query-layout {
  flex: 1 1 1280px;
  width: min(1280px, 100%);
}

.output-title {
  font-size: 16px;
  font-weight: 500;
}
</style>

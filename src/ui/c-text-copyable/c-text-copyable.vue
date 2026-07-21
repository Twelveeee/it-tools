<script setup lang="ts">
import { useCopy } from '@/composable/copy';

const props = withDefaults(defineProps<{ value?: string; displayedValue?: string; showIcon?: boolean }>(), { value: '', displayedValue: undefined, showIcon: true });
const { value, displayedValue, showIcon } = toRefs(props);

const { copy, isJustCopied } = useCopy({ source: value, createToast: false });
</script>

<template>
  <c-tooltip :tooltip="isJustCopied ? 'Copied!' : 'Copy to clipboard'">
    <button type="button" class="text-copyable" :aria-label="isJustCopied ? 'Copied!' : 'Copy to clipboard'" @click="copy()">
      {{ displayedValue ?? value }}
      <icon-mdi-content-copy v-if="showIcon" op-40 />
    </button>
  </c-tooltip>
</template>

<style scoped>
.text-copyable {
  all: unset;
  display: inline-flex;
  cursor: pointer;
  align-items: center;
  gap: 0.5rem;
}

.text-copyable:focus-visible {
  outline: 1px solid currentcolor;
  outline-offset: 2px;
}
</style>

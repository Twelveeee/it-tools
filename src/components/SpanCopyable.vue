<script setup lang="ts">
import { useCopy } from '@/composable/copy';

const props = withDefaults(defineProps<{ value?: string }>(), { value: '' });
const { value } = toRefs(props);

const initialText = 'Copy to clipboard';

const { copy, isJustCopied } = useCopy({ source: value, createToast: false });
const tooltipText = computed(() => isJustCopied.value ? 'Copied!' : initialText);
</script>

<template>
  <c-tooltip :tooltip="tooltipText">
    <button type="button" class="span-copyable" :aria-label="tooltipText" @click="copy()">
      {{ value }}
    </button>
  </c-tooltip>
</template>

<style scoped>
.span-copyable {
  all: unset;
  cursor: pointer;
  font-family: monospace;
}

.span-copyable:focus-visible {
  outline: 1px solid currentcolor;
  outline-offset: 2px;
}
</style>

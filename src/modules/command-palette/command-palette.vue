<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useCommandPaletteStore } from './command-palette.store';
import type { PaletteOption } from './command-palette.types';
import { getPaletteOptionAtIndex, normalizePaletteOptionIndex } from './command-palette.models';
import { generateRandomId } from '@/utils/random';

const isModalOpen = ref(false);
const inputRef = ref();
const router = useRouter();
const isMac = computed(() => window.navigator.userAgent.toLowerCase().includes('mac'));

const commandPaletteStore = useCommandPaletteStore();
const { searchPrompt, filteredSearchResult } = storeToRefs(commandPaletteStore);

const keys = useMagicKeys({
  passive: false,
  onEventFired(e) {
    if (e.ctrlKey && e.key === 'k' && e.type === 'keydown') {
      e.preventDefault();
    }

    if (e.metaKey && e.key === 'k' && e.type === 'keydown') {
      e.preventDefault();
    }
  },
});

whenever(isModalOpen, () => inputRef.value?.focus());

whenever(keys.ctrl_k, open);
whenever(keys.meta_k, open);

function open() {
  return isModalOpen.value = true;
}

function close() {
  isModalOpen.value = false;
  searchPrompt.value = '';
}

const flatOptions = computed<PaletteOption[]>(() => Object.values(filteredSearchResult.value).flat());
const selectedOptionIndex = ref(flatOptions.value.length > 0 ? 0 : -1);
const listboxId = generateRandomId();
const activeOptionId = computed(() => selectedOptionIndex.value >= 0 ? `${listboxId}-option-${selectedOptionIndex.value}` : undefined);

watch(flatOptions, (options) => {
  if (options.length === 0) {
    selectedOptionIndex.value = -1;
    return;
  }

  selectedOptionIndex.value = normalizePaletteOptionIndex({
    index: selectedOptionIndex.value,
    optionCount: options.length,
  });
});

watch(searchPrompt, () => {
  selectedOptionIndex.value = flatOptions.value.length > 0 ? 0 : -1;
});

function handleKeydown(event: KeyboardEvent) {
  const { key } = event;
  const isEnterPressed = key === 'Enter';
  const isArrowUpOrDown = ['ArrowUp', 'ArrowDown'].includes(key);
  const isArrowDown = key === 'ArrowDown';

  if (isArrowUpOrDown) {
    if (flatOptions.value.length === 0) {
      selectedOptionIndex.value = -1;
      event.preventDefault();
      return;
    }

    const increment = isArrowDown ? 1 : -1;
    const maxIndex = flatOptions.value.length - 1;

    selectedOptionIndex.value = Math.min(Math.max(selectedOptionIndex.value + increment, 0), maxIndex);

    event.preventDefault();
    return;
  }

  if (isEnterPressed) {
    const option = getPaletteOptionAtIndex(flatOptions.value, selectedOptionIndex.value);

    if (option) {
      activateOption(option);
      event.preventDefault();
    }
  }
}

function getOptionIndex(option: PaletteOption) {
  return flatOptions.value.findIndex(candidate => candidate === option);
}

function activateOption(option?: PaletteOption) {
  if (!option) {
    return;
  }

  const { closeOnSelect } = option;

  if (option.action) {
    option.action();

    if (closeOnSelect) {
      close();
    }

    return;
  }

  const closeAfterNavigation = closeOnSelect ?? true;

  if (option.to) {
    router.push(option.to);

    if (closeAfterNavigation) {
      close();
    }
    return;
  }

  if (option.href) {
    window.open(option.href, '_blank');

    if (closeAfterNavigation) {
      close();
    }
  }
}
</script>

<template>
  <div flex-1>
    <c-button
      w-full
      important:justify-start
      aria-haspopup="dialog"
      :aria-expanded="isModalOpen"
      @click="isModalOpen = true"
    >
      <span flex items-center gap-3 op-40>

        <icon-mdi-search />
        {{ $t('search.label') }}

        <span hidden flex-1 border border-current border-op-40 rounded border-solid px-5px py-3px sm:inline>
          {{ isMac ? 'Cmd' : 'Ctrl' }}&nbsp;+&nbsp;K
        </span>
      </span>
    </c-button>

    <c-modal v-model:open="isModalOpen" :aria-label="$t('search.label')" class="palette-modal" shadow-xl important:max-w-650px important:pa-12px @keydown="handleKeydown">
      <c-input-text
        ref="inputRef"
        v-model:value="searchPrompt"
        raw-text
        placeholder="Type to search a tool or a command..."
        :aria-label="$t('search.label')"
        input-role="combobox"
        aria-autocomplete="list"
        :aria-controls="listboxId"
        :aria-activedescendant="activeOptionId"
        :aria-expanded="isModalOpen"
        autofocus
        clearable
      />

      <div :id="listboxId" role="listbox" :aria-label="$t('search.label')">
        <div v-for="(options, category) in filteredSearchResult" :key="category" role="group" :aria-label="String(category)">
          <div ml-3 mt-3 text-sm text-primary font-bold op-60>
            {{ category }}
          </div>
          <command-palette-option
            v-for="option in options"
            :id="`${listboxId}-option-${getOptionIndex(option)}`"
            :key="option.name"
            :option="option"
            :selected="selectedOptionIndex === getOptionIndex(option)"
            @focused="selectedOptionIndex = getOptionIndex(option)"
            @activated="activateOption"
          />
        </div>

        <div v-if="flatOptions.length === 0" role="status" px-3 py-4 op-70>
          No results found
        </div>
      </div>
    </c-modal>
  </div>
</template>

<style scoped lang="less">
.c-input-text {
  font-size: 18px;

  ::v-deep(.input-wrapper) {
      padding: 4px;
      padding-left: 18px;
  }
}

.c-modal--overlay {
  align-items: flex-start !important;
  padding-top: 80px;
}
</style>

<script setup lang="ts" generic="T extends unknown">
import Fuse from 'fuse.js';
import { useAppTheme } from '../theme/themes';
import type { CLabelProps } from '../c-label/c-label.types';
import type { CSelectOption } from './c-select.types';
import { useTheme } from './c-select.theme';
import { clamp } from '@/modules/shared/number.models';
import { generateRandomId } from '@/utils/random';

const props = withDefaults(
  defineProps<{
    options?: CSelectOption<T>[] | string[]
    value?: T
    placeholder?: string
    size?: 'small' | 'medium' | 'large'
    searchable?: boolean
    disabled?: boolean
  } & CLabelProps >(),
  {
    options: () => [],
    value: undefined,
    placeholder: undefined,
    size: 'medium',
    searchable: false,
    disabled: false,
  },
);

const emits = defineEmits(['update:value']);

const { options: rawOptions, placeholder, size: sizeName, searchable, label, disabled } = toRefs(props);

const options = computed(() => {
  return rawOptions.value.map((option: string | CSelectOption<T>) => {
    if (typeof option === 'string') {
      return { label: option, value: option };
    }

    return option;
  });
});

const value = useVModel(props, 'value', emits);
const theme = useTheme();
const appTheme = useAppTheme();

const isOpen = ref(false);
const selectedOption = computed(() => options.value.find((option: CSelectOption<T>) => Object.is(option.value, value.value)));
const focusIndex = ref(-1);
const elementRef = ref<HTMLElement>();
const controlRef = ref<HTMLElement>();
const controlId = props.labelFor ?? generateRandomId();
const listboxId = `${controlId}-listbox`;
const selectAriaLabel = computed<string>(() => props.label ?? props.placeholder ?? 'Select an option');
const optionsAriaLabel = computed<string>(() => props.label ?? props.placeholder ?? 'Options');

const size = computed(() => theme.value.sizes[sizeName.value as 'small' | 'medium' | 'large']);

const searchQuery = ref('');
const searchInputRef = ref();

whenever(() => !isOpen.value, () => {
  focusIndex.value = -1;
  searchQuery.value = '';
});

whenever(() => isOpen.value, () => {
  nextTick(() => searchInputRef.value?.focus());
});

onClickOutside(elementRef, close);
const filteredOptions = computed(() => {
  if (searchQuery.value === '') {
    return options.value;
  }

  return new Fuse(options.value, {
    keys: ['label'],
    shouldSort: false,
    threshold: 0.3,
  }).search(searchQuery.value).map(({ item }) => item);
});

const activeOptionId = computed(() => focusIndex.value >= 0 ? `${controlId}-option-${focusIndex.value}` : undefined);

watch(filteredOptions, (newOptions) => {
  focusIndex.value = newOptions.length === 0
    ? -1
    : clamp({ value: focusIndex.value, min: 0, max: newOptions.length - 1 });
});

watch(disabled, (isDisabled) => {
  if (!isDisabled) {
    return;
  }

  close();
  nextTick(() => controlRef.value?.blur());
});

function close() {
  isOpen.value = false;
}

function open() {
  if (disabled.value) {
    return;
  }

  isOpen.value = true;
  focusIndex.value = filteredOptions.value.length > 0 ? 0 : -1;
}

function toggleOpen() {
  if (disabled.value) {
    close();
    return;
  }

  if (isOpen.value) {
    close();
  }
  else {
    open();
  }
}

function selectOption({ option }: { option?: CSelectOption<T> }) {
  if (disabled.value || !option) {
    return;
  }

  // @ts-expect-error vue template generic is a bit flacky thanks to withDefaults
  value.value = option.value;
  isOpen.value = false;
  nextTick(() => controlRef.value?.focus());
}

function handleKeydown(event: KeyboardEvent) {
  const { key } = event;
  const isSearchInput = event.target === searchInputRef.value;
  const isSelectKey = key === 'Enter' || (key === ' ' && !isSearchInput);
  const isArrowUpOrDown = ['ArrowUp', 'ArrowDown'].includes(key);
  const isArrowDown = key === 'ArrowDown';

  if (disabled.value) {
    close();
    if (['Enter', ' ', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key)) {
      event.preventDefault();
    }
    return;
  }

  if (key === 'Escape' && isOpen.value) {
    close();
    nextTick(() => controlRef.value?.focus());
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  if (key === 'Tab') {
    close();
    return;
  }

  if (isSelectKey) {
    const option = filteredOptions.value[focusIndex.value];

    if (isOpen.value && option) {
      selectOption({ option });
    }
    else if (!isOpen.value) {
      open();
    }

    event.preventDefault();
    return;
  }

  if (isArrowUpOrDown) {
    if (!isOpen.value) {
      open();
      focusIndex.value = isArrowDown ? 0 : filteredOptions.value.length - 1;
      event.preventDefault();
      return;
    }

    if (filteredOptions.value.length === 0) {
      focusIndex.value = -1;
      event.preventDefault();
      return;
    }

    const increment = isArrowDown ? 1 : -1;
    focusIndex.value = clamp({
      value: focusIndex.value + increment,
      min: 0,
      max: filteredOptions.value.length - 1,
    });

    event.preventDefault();
    return;
  }

  if (isOpen.value && ['Home', 'End'].includes(key) && filteredOptions.value.length > 0) {
    focusIndex.value = key === 'Home' ? 0 : filteredOptions.value.length - 1;
    event.preventDefault();
  }
}

function onSearchInput() {
  focusIndex.value = filteredOptions.value.length > 0 ? 0 : -1;
}
</script>

<template>
  <c-label v-bind="props" :label-for="controlId">
    <div ref="elementRef" relative class="c-select" w-full>
      <div
        :id="controlId"
        ref="controlRef"
        flex flex-nowrap items-center
        :class="{
          'is-open': isOpen,
          'is-disabled': disabled,
          'important:border-primary': isOpen && !disabled,
          'hover:important:border-primary': !disabled,
        }"
        class="c-select-input"
        :tabindex="disabled ? -1 : (searchable && isOpen ? -1 : 0)"
        :role="searchable && isOpen ? undefined : 'combobox'"
        :aria-label="selectAriaLabel"
        :aria-disabled="disabled"
        aria-haspopup="listbox"
        :aria-expanded="!disabled && isOpen"
        :aria-controls="listboxId"
        :aria-activedescendant="!disabled && isOpen ? activeOptionId : undefined"
        @click="toggleOpen"
        @keydown="handleKeydown"
      >
        <div flex-1 truncate>
          <slot name="displayed-value">
            <input
              v-if="searchable && isOpen"
              ref="searchInputRef"
              v-model="searchQuery"
              type="text"
              role="combobox"
              :aria-label="`${label ?? placeholder ?? 'Select an option'} search`"
              aria-autocomplete="list"
              aria-haspopup="listbox"
              aria-expanded="true"
              :aria-controls="listboxId"
              :aria-activedescendant="activeOptionId"
              placeholder="Search..."
              class="search-input"

              w-full color-current lh-normal
              @click.stop
              @input="onSearchInput"
            >
            <span v-else-if="selectedOption" lh-normal>
              {{ selectedOption.label }}
            </span>
            <span v-else class="placeholder" lh-normal>
              {{ placeholder ?? 'Select an option' }}
            </span>
          </slot>
        </div>

        <icon-mdi-chevron-down class="chevron" />
      </div>

      <transition name="dropdown">
        <div v-show="isOpen" :id="listboxId" role="listbox" :aria-label="optionsAriaLabel" class="c-select-dropdown" absolute z-10 mt-1 max-h-312px w-full overflow-y-auto pretty-scrollbar>
          <template v-if="!filteredOptions.length">
            <slot name="empty">
              <div role="status" px-4 py-1 opacity-70>
                No results found
              </div>
            </slot>
          </template>
          <template v-else>
            <div
              v-for="(option, index) in filteredOptions"
              :id="`${controlId}-option-${index}`"
              :key="option.label"
              role="option"
              :aria-selected="Object.is(selectedOption?.value, option.value)"
              cursor-pointer
              px-4
              py-1
              :class="{ active: selectedOption?.label === option.label, hover: focusIndex === index }"
              class="c-select-dropdown-option"
              @click="selectOption({ option })"
            >
              {{ option.label }}
            </div>
          </template>
        </div>
      </transition>
    </div>
  </c-label>
</template>

<style lang="less" scoped>
.c-select {
  .search-input{
    all: unset;

    &::placeholder {
      color: v-bind('appTheme.text.mutedColor');
    }
  }

  .c-select-input {
    background-color: v-bind('theme.backgroundColor');
    border: 1px solid v-bind('theme.borderColor');
    border-radius: 4px;
    padding: 0 12px;
    font-family: inherit;
    font-size: v-bind('size.fontSize');
    height: v-bind('size.height');
    transition: border-color 0.2s ease-in-out;
    cursor: pointer;

    &.is-disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }

    .placeholder, .chevron {
      color: v-bind('appTheme.text.mutedColor');
    }
  }

  .c-select-dropdown {
    background-color: v-bind('theme.backgroundColor');
    border-radius: 4px;
    // box-shadow: rgba(149, 157, 165, 0.2) 0px 8px 24px;
    box-shadow: v-bind('theme.dropdownShadow');
    font-family: inherit;
    font-size: inherit;
    line-height: 1;
    padding: 6px;

    .c-select-dropdown-option{
      border-radius: 4px;
      padding: 8px 12px;
      background-color: transparent;
      transition: background-color 0.2s ease-in-out;

      &.active {
        color: v-bind('theme.option.active.textColor');
      }

      &:hover, &.hover {
        background-color: v-bind('theme.option.hover.backgroundColor');
      }
    }
  }
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.dropdown-enter-to,
.dropdown-leave-from {
  opacity: 1;
  transform: translateY(0);
}
</style>

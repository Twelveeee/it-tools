<script setup lang="ts">
import { useTheme } from './c-modal.theme';

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(defineProps<{
  open?: boolean
  centered?: boolean
  ariaLabel?: string
  ariaLabelledby?: string
  closeOnOverlay?: boolean
}>(), {
  open: false,
  centered: true,
  ariaLabel: 'Dialog',
  ariaLabelledby: undefined,
  closeOnOverlay: true,
});

const emit = defineEmits(['update:open']);

const isOpen = useVModel(props, 'open', emit, { passive: true });

const { centered } = toRefs(props);

function close() {
  isOpen.value = false;
}

function open() {
  isOpen.value = true;
}

function toggle() {
  isOpen.value = !isOpen.value;
}

defineExpose({
  close,
  open,
  toggle,
  isOpen,
});

const theme = useTheme();
const modal = ref<HTMLElement>();
let previouslyFocusedElement: HTMLElement | null = null;

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusableElements() {
  return Array.from(modal.value?.querySelectorAll<HTMLElement>(focusableSelector) ?? []);
}

function focusInitialElement() {
  if (!modal.value || modal.value.contains(document.activeElement)) {
    return;
  }

  const autofocusElement = modal.value.querySelector<HTMLElement>('[autofocus]');
  (autofocusElement ?? getFocusableElements()[0] ?? modal.value).focus();
}

function restoreFocus() {
  previouslyFocusedElement?.focus();
  previouslyFocusedElement = null;
}

watch(isOpen, async (openValue) => {
  if (openValue) {
    previouslyFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    await nextTick();
    focusInitialElement();
    return;
  }

  restoreFocus();
}, { immediate: true });

onBeforeUnmount(restoreFocus);

function handleOverlayMouseDown(event: MouseEvent) {
  if (props.closeOnOverlay && event.target === event.currentTarget) {
    close();
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    close();
    return;
  }

  if (event.key !== 'Tab') {
    return;
  }

  const focusableElements = getFocusableElements();
  if (focusableElements.length === 0) {
    event.preventDefault();
    modal.value?.focus();
    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  const activeElement = document.activeElement;

  if (event.shiftKey && (
    activeElement === firstElement
    || activeElement === modal.value
    || !modal.value?.contains(activeElement)
  )) {
    event.preventDefault();
    lastElement.focus();
  }
  else if (!event.shiftKey && activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}
</script>

<template>
  <transition>
    <div v-if="isOpen" class="c-modal--overlay" fixed left-0 top-0 z-10 h-full w-full flex justify-center px-2 :class="{ 'items-center': centered }" @mousedown="handleOverlayMouseDown">
      <div
        ref="modal"
        class="c-modal--container"
        v-bind="$attrs"
        role="dialog"
        aria-modal="true"
        :aria-label="ariaLabelledby ? undefined : ariaLabel"
        :aria-labelledby="ariaLabelledby"
        tabindex="-1"
        max-w-xl
        w-full
        flex-grow
        rounded-md
        pa-24px
        @keydown="handleKeydown"
      >
        <slot />
      </div>
    </div>
  </transition>
</template>

<style scoped lang="less">
.c-modal--overlay {
  background-color: rgba(0, 0, 0, 0.5);
}

.c-modal--container {
  background-color: v-bind('theme.background');
}

.v-enter-active,
.v-leave-active {
  transition: opacity 0.3s ease-in-out;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}
</style>

<script setup lang="ts">
import { generateRandomId } from '@/utils/random';

const props = withDefaults(defineProps<{ tooltip?: string; position?: 'top' | 'bottom' | 'left' | 'right' }>(), {
  tooltip: undefined,
  position: 'top',
});
const { tooltip, position } = toRefs(props);

const targetRef = ref<HTMLElement>();
const isTargetHovered = useElementHover(targetRef);
const isTargetFocused = ref(false);
const tooltipId = generateRandomId();
const slots = useSlots();
const hasTooltip = computed(() => Boolean(tooltip.value || slots.tooltip));
const isVisible = computed(() => hasTooltip.value && (isTargetHovered.value || isTargetFocused.value));
const describedElements = new Set<HTMLElement>();
const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function updateDescribedBy(element: HTMLElement, addTooltip: boolean) {
  const ids = new Set((element.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean));
  if (addTooltip) {
    ids.add(tooltipId);
  }
  else {
    ids.delete(tooltipId);
  }

  const describedBy = [...ids].join(' ');
  if (describedBy) {
    element.setAttribute('aria-describedby', describedBy);
  }
  else {
    element.removeAttribute('aria-describedby');
  }
}

function syncDescribedElements() {
  describedElements.forEach(element => updateDescribedBy(element, false));
  describedElements.clear();

  if (!hasTooltip.value) {
    return;
  }

  targetRef.value?.querySelectorAll<HTMLElement>(focusableSelector).forEach((element: HTMLElement) => {
    updateDescribedBy(element, true);
    describedElements.add(element);
  });
}

onMounted(() => nextTick(syncDescribedElements));
onUpdated(syncDescribedElements);
onBeforeUnmount(() => {
  describedElements.forEach(element => updateDescribedBy(element, false));
});

function handleFocusOut(event: FocusEvent) {
  const nextTarget = event.relatedTarget;
  if (!(nextTarget instanceof Node) || !(event.currentTarget as HTMLElement).contains(nextTarget)) {
    isTargetFocused.value = false;
  }
}
</script>

<template>
  <div relative inline-block>
    <div
      ref="targetRef"
      @focusin="isTargetFocused = true"
      @focusout="handleFocusOut"
    >
      <slot />
    </div>

    <div
      v-if="hasTooltip"
      :id="tooltipId"
      role="tooltip"
      :aria-hidden="!isVisible"
      class="pointer-events-none absolute z-10 whitespace-nowrap rounded bg-black px-12px py-6px text-sm text-white shadow-lg transition transition-duration-0.2s"
      :class="{
        'op-0 scale-0': !isVisible,
        'op-100 scale-100': isVisible,
        'bottom-100% left-50% -translate-x-1/2 mb-5px': position === 'top',
        'top-100% left-50% -translate-x-1/2 mt-5px': position === 'bottom',
        'right-100% top-50% -translate-y-1/2 mr-5px': position === 'left',
        'left-100% top-50% -translate-y-1/2 ml-5px': position === 'right',
      }"
    >
      <slot name="tooltip">
        {{ tooltip }}
      </slot>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { type RouteLocationRaw, RouterLink } from 'vue-router';
import { useAppTheme } from '../theme/themes';
import { useTheme } from './c-button.theme';

const props = withDefaults(
  defineProps<{
    type?: 'default' | 'primary' | 'warning' | 'error'
    variant?: 'basic' | 'text'
    disabled?: boolean
    round?: boolean
    circle?: boolean
    href?: string
    to?: RouteLocationRaw
    size?: 'small' | 'medium' | 'large'
    nativeType?: 'button' | 'submit' | 'reset'
  }>(),
  {
    type: 'default',
    variant: 'basic',
    disabled: false,
    round: false,
    circle: false,
    href: undefined,
    to: undefined,
    size: 'medium',
    nativeType: 'button',
  },
);
const emits = defineEmits(['click']);

const { variant, disabled, round, circle, href, type, to, size: sizeName, nativeType } = toRefs(props);

function handleClick(event: MouseEvent) {
  if (disabled.value) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  emits('click', event);
}

const theme = useTheme();
const variantTheme = computed(() => theme.value[variant.value][type.value]);
const isRouterLink = computed(() => Boolean(to.value) && !disabled.value);
const routerTarget = computed<RouteLocationRaw>(() => to.value ?? '/');
const tag = computed(() => {
  if (disabled.value && (href.value || to.value)) {
    return 'span';
  }
  if (href.value) {
    return 'a';
  }
  return 'button';
});
const appTheme = useAppTheme();

const size = computed(() => theme.value.size[sizeName.value]);
</script>

<template>
  <RouterLink
    v-if="isRouterLink"
    :to="routerTarget"
    class="c-button"
    :class="{ disabled, round, circle }"
    @click="handleClick"
  >
    <slot />
  </RouterLink>
  <component
    :is="tag"
    v-else
    :href="tag === 'a' ? href : undefined"
    class="c-button"
    :class="{ disabled, round, circle }"
    :type="tag === 'button' ? nativeType : undefined"
    :disabled="tag === 'button' ? disabled : undefined"
    :aria-disabled="disabled || undefined"
    :role="tag === 'span' && (href || to) ? 'link' : undefined"
    :tabindex="tag === 'span' && (href || to) ? -1 : undefined"
    @click="handleClick"
  >
    <slot />
  </component>
</template>

<style lang="less" scoped>
.c-button {
  line-height: 1;
  font-family: inherit;
  font-size: v-bind('size.fontSize');
  border: none;
  text-align: center;
  cursor: pointer;
  text-decoration: none;
  height: v-bind('size.width');
  font-weight: 400;
  color: v-bind('variantTheme.textColor');
  padding: 0 14px;
  border-radius: 4px;
  transition: background-color cubic-bezier(0.4, 0, 0.2, 1) 0.3s;

  background-color: v-bind('variantTheme.backgroundColor');
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  // outline-offset: 1px;
  &.round {
    border-radius: 100px;
  }

  &.circle {
    border-radius: v-bind('size.width');
    width: v-bind('size.width');
    padding: 0;
  }

  &:not(.disabled) {
    &:hover {
      background-color: v-bind('variantTheme.hover.backgroundColor');
    }

    &:active {
      background-color: v-bind('variantTheme.pressed.backgroundColor');
    }
  }

  &:focus-visible {
    outline: 1px solid v-bind('appTheme.primary.color');
    outline-offset: 2px;
  }

  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>

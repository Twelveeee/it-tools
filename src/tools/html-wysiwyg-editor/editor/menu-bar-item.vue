<script setup lang="ts">
import type { Component } from 'vue';

const props = defineProps<{ icon: Component; title: string; action: () => void; isActive?: () => boolean }>();
const { icon, title, action, isActive } = toRefs(props);
</script>

<template>
  <c-tooltip :tooltip="title">
    <c-button :aria-label="title" circle variant="text" :type="isActive?.() ? 'primary' : 'default'" @click="action">
      <n-icon :component="icon" aria-hidden="true" />
    </c-button>
  </c-tooltip>
</template>

<script setup lang="ts">
import { useThemeVars } from 'naive-ui';
import FavoriteButton from './FavoriteButton.vue';
import type { Tool } from '@/tools/tools.types';

const props = defineProps<{ tool: Tool & { category: string } }>();
const { tool } = toRefs(props);
const theme = useThemeVars();
</script>

<template>
  <c-card class="relative h-full transition transition-duration-0.5s !border-2px !hover:border-primary">
    <router-link :to="tool.path" class="block decoration-none">
      <div flex items-center pr-80px>
        <n-icon class="text-neutral-400 dark:text-neutral-600" size="40" :component="tool.icon" />
      </div>

      <h3 class="my-5px truncate text-lg text-black font-normal dark:text-white">
        {{ tool.name }}
      </h3>

      <div class="line-clamp-2 text-neutral-500 dark:text-neutral-400">
        {{ tool.description }}
      </div>
    </router-link>

    <div absolute right-24px top-20px flex items-center gap-8px>
      <div
        v-if="tool.isNew"
        class="rounded-full px-8px py-3px text-xs text-white dark:text-neutral-800"
        :style="{
          'background-color': theme.primaryColor,
        }"
      >
        {{ $t('toolCard.new') }}
      </div>

      <FavoriteButton :tool="tool" />
    </div>
  </c-card>
</template>

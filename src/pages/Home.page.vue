<script setup lang="ts">
import { IconDragDrop } from '@tabler/icons-vue';
import { useHead } from '@unhead/vue';
import { computed } from 'vue';
import Draggable from 'vuedraggable';
import ToolCard from '../components/ToolCard.vue';
import { useToolStore } from '@/tools/tools.store';

const toolStore = useToolStore();

useHead({ title: 'IT Tools - Handy online tools for developers' });
const { t } = useI18n();

const favoriteTools = computed(() => toolStore.favoriteTools);

// Update favorite tools order when drag is finished
function onUpdateFavoriteTools() {
  toolStore.updateFavoriteTools(favoriteTools.value); // Update the store with the new order
}

function moveFavorite(index: number, direction: -1 | 1) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= favoriteTools.value.length) {
    return;
  }

  const reorderedFavorites = [...favoriteTools.value];
  [reorderedFavorites[index], reorderedFavorites[targetIndex]] = [reorderedFavorites[targetIndex], reorderedFavorites[index]];
  toolStore.updateFavoriteTools(reorderedFavorites);
}
</script>

<template>
  <div class="pt-50px">
    <h1 class="sr-only">
      IT Tools — {{ $t('home.subtitle') }}
    </h1>

    <div class="grid-wrapper">
      <transition name="height">
        <div v-if="toolStore.favoriteTools.length > 0">
          <h2 class="mb-5px mt-25px text-base text-neutral-400 font-500">
            {{ $t('home.categories.favoriteTools') }}
            <c-tooltip :tooltip="$t('home.categories.favoritesDndToolTip')">
              <n-icon :component="IconDragDrop" size="18" aria-hidden="true" />
            </c-tooltip>
          </h2>
          <Draggable
            :list="favoriteTools"
            class="grid grid-cols-1 gap-12px lg:grid-cols-3 md:grid-cols-3 sm:grid-cols-2 xl:grid-cols-4"
            ghost-class="ghost-favorites-draggable"
            item-key="name"
            @end="onUpdateFavoriteTools"
          >
            <template #item="{ element: tool, index }">
              <div>
                <ToolCard :tool="tool" />
                <div mt-1 flex justify-end gap-1>
                  <c-button
                    variant="text"
                    size="small"
                    :disabled="index === 0"
                    :aria-label="`Move ${tool.name} earlier`"
                    @click="moveFavorite(index, -1)"
                  >
                    <icon-mdi-arrow-left aria-hidden="true" />
                  </c-button>
                  <c-button
                    variant="text"
                    size="small"
                    :disabled="index === favoriteTools.length - 1"
                    :aria-label="`Move ${tool.name} later`"
                    @click="moveFavorite(index, 1)"
                  >
                    <icon-mdi-arrow-right aria-hidden="true" />
                  </c-button>
                </div>
              </div>
            </template>
          </Draggable>
        </div>
      </transition>

      <div v-if="toolStore.newTools.length > 0">
        <h2 class="mb-5px mt-25px text-base text-neutral-400 font-500">
          {{ t('home.categories.newestTools') }}
        </h2>
        <div class="grid grid-cols-1 gap-12px lg:grid-cols-3 md:grid-cols-3 sm:grid-cols-2 xl:grid-cols-4">
          <ToolCard v-for="tool in toolStore.newTools" :key="tool.name" :tool="tool" />
        </div>
      </div>

      <h2 class="mb-5px mt-25px text-base text-neutral-400 font-500">
        {{ $t('home.categories.allTools') }}
      </h2>
      <div class="grid grid-cols-1 gap-12px lg:grid-cols-3 md:grid-cols-3 sm:grid-cols-2 xl:grid-cols-4">
        <ToolCard v-for="tool in toolStore.tools" :key="tool.name" :tool="tool" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.height-enter-active,
.height-leave-active {
  transition: all 0.5s ease-in-out;
  overflow: hidden;
  max-height: 500px;
}

.height-enter-from,
.height-leave-to {
  max-height: 42px;
  overflow: hidden;
  opacity: 0;
  margin-bottom: 0;
}

.ghost-favorites-draggable {
  opacity: 0.4;
  background-color: #ccc;
  border: 2px dashed #666;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
  transform: scale(1.1);
  animation: ghost-favorites-draggable-animation 0.2s ease-out;
}

@keyframes ghost-favorites-draggable-animation {
  0% {
    opacity: 0;
    transform: scale(0.9);
  }
  100% {
    opacity: 0.4;
    transform: scale(1.0);
  }
}
</style>

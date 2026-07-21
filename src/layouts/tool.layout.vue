<script lang="ts" setup>
import { useRoute } from 'vue-router';
import { useHead } from '@unhead/vue';

import BaseLayout from './base.layout.vue';
import FavoriteButton from '@/components/FavoriteButton.vue';
import { config } from '@/config';
import type { Tool } from '@/tools/tools.types';

const route = useRoute();
const { t } = useI18n();

const i18nKey = computed<string>(() => route.path.trim().replace('/', ''));
const toolTitle = computed<string>(() => t(`tools.${i18nKey.value}.title`, String(route.meta.name)));
const toolDescription = computed<string>(() => t(`tools.${i18nKey.value}.description`, String(route.meta.description)));
const canonicalUrl = computed(() => {
  const basePath = config.app.baseUrl.replace(/\/+$/, '');
  const canonicalPath = `${basePath}/${route.path.replace(/^\/+/, '')}`;
  return new URL(canonicalPath, config.app.siteUrl).toString();
});

const head = computed(() => ({
  title: `${toolTitle.value} - IT Tools`,
  link: [
    {
      rel: 'canonical',
      href: canonicalUrl.value,
    },
  ],
  meta: [
    {
      name: 'description',
      content: toolDescription.value,
    },
    {
      name: 'keywords',
      content: ((route.meta.keywords ?? []) as string[]).join(','),
    },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: 'IT Tools' },
    { property: 'og:title', content: `${toolTitle.value} - IT Tools` },
    { property: 'og:description', content: toolDescription.value },
    { property: 'og:url', content: canonicalUrl.value },
  ],
  script: [
    {
      id: 'tool-structured-data',
      type: 'application/ld+json',
      textContent: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        'applicationCategory': 'DeveloperApplication',
        'description': toolDescription.value,
        'isAccessibleForFree': true,
        'name': toolTitle.value,
        'operatingSystem': 'Any',
        'url': canonicalUrl.value,
      }),
    },
  ],
}));
useHead(head);
</script>

<template>
  <BaseLayout>
    <div class="tool-layout">
      <div class="tool-header">
        <div flex flex-nowrap items-center justify-between>
          <n-h1>
            {{ toolTitle }}
          </n-h1>

          <div>
            <FavoriteButton :tool="{ name: route.meta.name, path: route.path } as Tool" />
          </div>
        </div>

        <div class="separator" />

        <div class="description">
          {{ toolDescription }}
        </div>
      </div>
    </div>

    <div class="tool-content">
      <slot />
    </div>
  </BaseLayout>
</template>

<style lang="less" scoped>
.tool-content {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;

  ::v-deep(& > *) {
    flex: 0 1 600px;
  }

  ::v-deep(& > .tool-wide) {
    flex: 1 1 1280px;
    width: min(1280px, 100%);
    max-width: 1280px;
  }
}

.tool-layout {
  max-width: 600px;
  margin: 0 auto;
  box-sizing: border-box;

  .tool-header {
    padding: 40px 0;
    width: 100%;

    .n-h1 {
      opacity: 0.9;
      font-size: 40px;
      font-weight: 400;
      margin: 0;
      line-height: 1;
    }

    .separator {
      width: 200px;
      height: 2px;
      background: rgb(161, 161, 161);
      opacity: 0.2;

      margin: 10px 0;
    }

    .description {
      margin: 0;

      opacity: 0.7;
    }
  }
}
</style>

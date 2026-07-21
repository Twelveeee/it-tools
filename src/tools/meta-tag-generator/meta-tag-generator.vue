<script setup lang="ts">
import { image, ogSchemas, twitter, website } from './og-schemas';
import type { OGSchemaType, OGSchemaTypeElementSelect } from './OGSchemaType.type';
import { generateMetaTags } from './meta-tag-generator.service';
import TextareaCopyable from '@/components/TextareaCopyable.vue';

// Since type guards do not work in template

const metadata = ref<{ type: string; [k: string]: any }>({
  'type': 'website',
  'twitter:card': 'summary_large_image',
});

watch(
  () => ref(metadata.value.type),
  (_ignored, prevSection) => {
    const section = ogSchemas[prevSection.value];

    if (!section) {
      return;
    }

    section.elements.forEach(({ key }) => {
      metadata.value[key] = '';
    });
  },
);

const sections = computed(() => {
  const secs: OGSchemaType[] = [website, image, twitter];
  const additionalSchema = ogSchemas[metadata.value.type];

  if (additionalSchema) {
    secs.push(additionalSchema);
  }

  return secs;
});

const metaTags = computed(() => {
  return generateMetaTags(metadata.value);
});
</script>

<template>
  <div>
    <div v-for="{ name, elements } of sections" :key="name" style="margin-bottom: 15px">
      <div mb-5px>
        {{ name }}
      </div>

      <n-input-group v-for="{ key, type, label, placeholder, ...element } of elements" :key="key">
        <n-input-group-label style="flex: 0 0 110px">
          {{ label }}
        </n-input-group-label>

        <c-input-text v-if="type === 'input'" v-model:value="metadata[key]" :placeholder="placeholder" clearable />
        <n-dynamic-input
          v-else-if="type === 'input-multiple'"
          v-model:value="metadata[key]"
          :min="1"
          :placeholder="placeholder"
          :default-value="['']"
          :show-sort-button="true"
        />

        <c-select
          v-else-if="type === 'select'"
          v-model:value="metadata[key]"
          w-full
          :placeholder="placeholder"
          :options="(element as OGSchemaTypeElementSelect).options"
        />
      </n-input-group>
    </div>
  </div>
  <div>
    <n-form-item label="Your meta tags">
      <TextareaCopyable :value="metaTags" language="html" />
    </n-form-item>
  </div>
</template>

<style lang="less" scoped>
.n-input-group {
  margin-bottom: 5px;
}

::v-deep(.n-form-item-blank) {
  min-height: 0 !important;
}
::v-deep(.n-dynamic-input-item) {
  margin-bottom: 5px;
}
</style>

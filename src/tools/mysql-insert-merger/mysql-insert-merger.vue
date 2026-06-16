<script setup lang="ts">
import { transformMysqlInserts } from './mysql-insert-merger.service';
import CInputText from '@/ui/c-input-text/c-input-text.vue';
import { useCopy } from '@/composable/copy';
import { useValidation } from '@/composable/validation';

const defaultInput = "INSERT INTO `demo_app`.`demo_event_log` (`id`, `keyword`, `pid`, `source`, `source_cate`, `raw_heat_value`, `heat_value`, `max_rank`, `first_rank_time`, `last_rank_time`, `created_at`, `updated_at`) VALUES (101, 'sample topic alpha', 9001, 'demo', 'example category', 123456, 7890, 12, '2026-01-01 10:00:00', '2026-01-01 10:00:00', '2026-01-01 10:05:00', '2026-01-01 10:10:00');\nINSERT INTO `demo_app`.`demo_event_log` (`id`, `keyword`, `pid`, `source`, `source_cate`, `raw_heat_value`, `heat_value`, `max_rank`, `first_rank_time`, `last_rank_time`, `created_at`, `updated_at`) VALUES (102, 'sample topic beta', 9002, 'demo', 'sample category', 234567, 8901, 8, '2026-01-01 10:15:00', '2026-01-01 10:15:00', '2026-01-01 10:20:00', '2026-01-01 10:25:00');";

const input = useStorage('mysql-insert-merger:input', defaultInput);
const removeDatabaseName = useStorage('mysql-insert-merger:remove-database-name', true);
const removeId = useStorage('mysql-insert-merger:remove-id', true);
const batchSize = useStorage<number | null>('mysql-insert-merger:batch-size', 1000);

const transformResult = computed(() => transformMysqlInserts(input.value, {
  removeDatabaseName: removeDatabaseName.value,
  removeId: removeId.value,
  batchSize: batchSize.value,
}));

const validation = useValidation({
  source: input,
  rules: [
    {
      validator: () => transformResult.value.ok,
      message: '{0}',
      getErrorMessage: () => transformResult.value.ok ? '' : transformResult.value.error,
    },
  ],
  watch: [removeDatabaseName, removeId, batchSize],
});

const output = computed(() => transformResult.value.ok ? transformResult.value.value : '');
const { copy } = useCopy({ source: output, text: 'MySQL INSERT output copied to the clipboard' });
</script>

<template>
  <div class="mysql-insert-merger-layout" grid grid-cols-1 items-stretch gap-16px xl:grid-cols-2>
    <c-card title="Input INSERT statements" class="h-full">
      <div mb-4 flex flex-wrap items-end gap-4>
        <n-checkbox v-model:checked="removeDatabaseName">
          Remove database name
        </n-checkbox>

        <n-checkbox v-model:checked="removeId">
          Remove id column
        </n-checkbox>

        <n-form-item label="Merge batch size" label-placement="left" :show-feedback="false" class="batch-size-control">
          <n-input-number
            v-model:value="batchSize"
            clearable
            placeholder="Empty = no merge"
            :min="0"
            :precision="0"
            :show-button="false"
          />
        </n-form-item>
      </div>

      <CInputText
        v-model:value="input"
        multiline
        rows="22"
        autosize
        raw-text
        monospace
        autofocus
        placeholder="Paste your INSERT statements here..."
        :validation="validation"
      />
    </c-card>

    <c-card class="h-full flex flex-col">
      <div mb-5 flex items-center justify-between gap-4>
        <div class="output-title">
          Merged INSERT statements
        </div>

        <c-button @click="copy()">
          Copy output
        </c-button>
      </div>

      <div mb-4 flex-1>
        <CInputText
          :value="output"
          multiline
          rows="22"
          monospace
          raw-text
          readonly
          placeholder="Your converted INSERT statements will appear here..."
        />
      </div>
    </c-card>
  </div>
</template>

<style lang="less" scoped>
.mysql-insert-merger-layout {
  flex: 1 1 1280px;
  width: min(1280px, 100%);
}

.output-title {
  font-size: 16px;
  font-weight: 500;
}

.batch-size-control {
  margin-bottom: 0;
  min-width: 240px;
}
</style>

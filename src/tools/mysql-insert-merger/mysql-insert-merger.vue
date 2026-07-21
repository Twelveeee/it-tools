<script setup lang="ts">
import { transformMysqlInserts } from './mysql-insert-merger.service';
import CInputText from '@/ui/c-input-text/c-input-text.vue';
import { useCopy } from '@/composable/copy';
import { useValidation } from '@/composable/validation';

const defaultInput = 'INSERT INTO users (id, name) VALUES (1, \'Alice\');';

const input = ref(defaultInput);
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

onMounted(() => localStorage.removeItem('mysql-insert-merger:input'));
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

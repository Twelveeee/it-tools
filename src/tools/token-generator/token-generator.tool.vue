<script setup lang="ts">
import { MAX_TOKEN_LENGTH, createToken } from './token-generator.service';
import { useCopy } from '@/composable/copy';
import { useQueryParam } from '@/composable/queryParams';
import { computedRefreshable } from '@/composable/computedRefreshable';

const length = useQueryParam({ name: 'length', defaultValue: 64 });
const withUppercase = useQueryParam({ name: 'uppercase', defaultValue: true });
const withLowercase = useQueryParam({ name: 'lowercase', defaultValue: true });
const withNumbers = useQueryParam({ name: 'numbers', defaultValue: true });
const withSymbols = useQueryParam({ name: 'symbols', defaultValue: false });
const { t } = useI18n();

const safeLength = computed(() => {
  const parsedLength = Number(length.value);
  if (!Number.isFinite(parsedLength)) {
    return 64;
  }

  return Math.min(MAX_TOKEN_LENGTH, Math.max(1, Math.trunc(parsedLength)));
});

const lengthInputValue = computed<number | null>({
  get: () => safeLength.value,
  set: (value) => {
    if (value !== null) {
      length.value = Math.min(MAX_TOKEN_LENGTH, Math.max(1, Math.trunc(value)));
    }
  },
});

const [token, refreshToken] = computedRefreshable(() =>
  createToken({
    length: safeLength.value,
    withUppercase: withUppercase.value,
    withLowercase: withLowercase.value,
    withNumbers: withNumbers.value,
    withSymbols: withSymbols.value,
  }),
);

const { copy } = useCopy({ source: token, text: t('tools.token-generator.copied') });
</script>

<template>
  <div>
    <c-card>
      <n-form label-placement="left" label-width="140">
        <div flex justify-center>
          <div>
            <n-form-item :label="t('tools.token-generator.uppercase')">
              <n-switch v-model:value="withUppercase" />
            </n-form-item>

            <n-form-item :label="t('tools.token-generator.lowercase')">
              <n-switch v-model:value="withLowercase" />
            </n-form-item>
          </div>

          <div>
            <n-form-item :label="t('tools.token-generator.numbers')">
              <n-switch v-model:value="withNumbers" />
            </n-form-item>

            <n-form-item :label="t('tools.token-generator.symbols')">
              <n-switch v-model:value="withSymbols" />
            </n-form-item>
          </div>
        </div>
      </n-form>

      <n-form-item :label="t('tools.token-generator.length')" label-placement="left">
        <div class="length-controls">
          <n-slider v-model:value="length" :step="1" :min="1" :max="512" />
          <n-input-number
            v-model:value="lengthInputValue"
            class="length-input"
            :step="1"
            :min="1"
            :max="MAX_TOKEN_LENGTH"
            :precision="0"
          />
        </div>
      </n-form-item>

      <c-input-text
        v-model:value="token"

        :placeholder="t('tools.token-generator.tokenPlaceholder')"

        rows="3"
        readonly autosize multiline
        class="token-display"
      />

      <div mt-5 flex justify-center gap-3>
        <c-button @click="copy()">
          {{ t('tools.token-generator.button.copy') }}
        </c-button>
        <c-button @click="refreshToken">
          {{ t('tools.token-generator.button.refresh') }}
        </c-button>
      </div>
    </c-card>
  </div>
</template>

<style scoped lang="less">
.length-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.length-input {
  flex: 0 0 104px;
}

::v-deep(.token-display) {
  textarea {
    text-align: center;
  }
}
</style>

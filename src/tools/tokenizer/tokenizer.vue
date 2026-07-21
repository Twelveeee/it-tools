<script setup lang="ts">
import { Trash } from '@vicons/tabler';
import { MAX_TOKENIZER_INPUT_LENGTH, createDefaultChatMessages, createNewChatMessage, defaultTokenizerModelId } from './tokenizer.models';
import { encodeWhitespace, getTokenizerModel, tokenizerModels } from './tokenizer.registry';
import type { ChatMessage, TokenizationResult, TokenizerInputMode, TokenizerWorkerResponse } from './tokenizer.models';
import { assertTokenizerInputLength } from './tokenizer.service';
import { useCopy } from '@/composable/copy';

const modelId = ref(defaultTokenizerModelId);
const inputMode = ref<TokenizerInputMode>('text');
const plainText = ref('');
const chatMessages = ref<ChatMessage[]>(createDefaultChatMessages());
const showWhitespace = ref(false);
const enableThinking = ref(true);
const hoveredSegmentIndex = ref<number | null>(null);
const loading = ref(false);
const loadError = ref('');
const result = shallowRef<TokenizationResult | null>(null);
const tokenIdsText = computed(() => (result.value?.tokens ?? []).map(({ id }) => id).join(', '));
const availableModelsText = computed(() => tokenizerModels.map(({ label }) => label).join(', '));
const { copy: copyTokenIds, isJustCopied } = useCopy({ source: tokenIdsText, createToast: false });

const colors = [
  '#dbeafe',
  '#fef3c7',
  '#d1fae5',
  '#fce7f3',
  '#ede9fe',
  '#cffafe',
  '#fed7aa',
  '#fecdd3',
  '#fde68a',
  '#bfdbfe',
];

const tokenizerOptions = computed(() =>
  tokenizerModels.map(({ id, label, group }) => ({
    label: group === label ? label : `${group} / ${label}`,
    value: id,
  })),
);

const currentModel = computed(() => getTokenizerModel(modelId.value));
const serializationError = computed(() => {
  if (inputMode.value !== 'chat') {
    return '';
  }

  try {
    currentModel.value.serializer(chatMessages.value, { addGenerationPrompt: true, enableThinking: enableThinking.value });
    return '';
  }
  catch (error) {
    return error instanceof Error ? error.message : 'Unable to serialize chat messages.';
  }
});

const serializedInput = computed(() => {
  if (inputMode.value === 'text') {
    return plainText.value;
  }

  if (serializationError.value) {
    return '';
  }

  return currentModel.value.serializer(chatMessages.value, { addGenerationPrompt: true, enableThinking: enableThinking.value });
});

let tokenizerWorker: Worker | null = null;
let tokenizationTimeoutId: number | undefined;
let responseTimeoutId: number | undefined;
let activeRequestId: number | null = null;
let latestRequestId = 0;

function disposeTokenizerWorker() {
  window.clearTimeout(responseTimeoutId);
  responseTimeoutId = undefined;
  activeRequestId = null;
  tokenizerWorker?.terminate();
  tokenizerWorker = null;
}

function getTokenizerWorker() {
  if (tokenizerWorker) {
    return tokenizerWorker;
  }

  tokenizerWorker = new Worker(new URL('./tokenizer.worker.ts', import.meta.url), { type: 'module' });
  tokenizerWorker.onmessage = ({ data }: MessageEvent<TokenizerWorkerResponse>) => {
    if (data.id !== latestRequestId) {
      return;
    }

    window.clearTimeout(responseTimeoutId);
    responseTimeoutId = undefined;
    activeRequestId = null;

    if ('error' in data) {
      result.value = null;
      loadError.value = data.error;
    }
    else {
      result.value = data.result;
      loadError.value = '';
    }
    loading.value = false;
  };
  tokenizerWorker.onerror = () => {
    disposeTokenizerWorker();
    result.value = null;
    loadError.value = 'Unable to start the tokenizer worker.';
    loading.value = false;
  };

  return tokenizerWorker;
}

watch([modelId, serializedInput, serializationError], ([nextModelId, nextInput, nextSerializationError]) => {
  const requestId = ++latestRequestId;
  window.clearTimeout(tokenizationTimeoutId);
  if (activeRequestId !== null) {
    disposeTokenizerWorker();
  }
  result.value = null;
  loadError.value = '';

  if (nextSerializationError || nextInput.length === 0) {
    loading.value = false;
    return;
  }

  try {
    assertTokenizerInputLength(nextInput);
  }
  catch (error) {
    loadError.value = error instanceof Error ? error.message : 'Tokenizer input is too large.';
    loading.value = false;
    return;
  }

  loading.value = true;
  tokenizationTimeoutId = window.setTimeout(() => {
    try {
      const worker = getTokenizerWorker();
      activeRequestId = requestId;
      responseTimeoutId = window.setTimeout(() => {
        if (activeRequestId !== requestId) {
          return;
        }
        disposeTokenizerWorker();
        result.value = null;
        loadError.value = 'Tokenization exceeded 25 seconds and was stopped.';
        loading.value = false;
      }, 25_000);
      worker.postMessage({ id: requestId, modelId: nextModelId, serializedInput: nextInput });
    }
    catch (error) {
      disposeTokenizerWorker();
      loadError.value = error instanceof Error ? error.message : 'Unable to start the tokenizer worker.';
      loading.value = false;
    }
  }, 180);
}, { immediate: true });

onBeforeUnmount(() => {
  window.clearTimeout(tokenizationTimeoutId);
  disposeTokenizerWorker();
});

watch(currentModel, (definition) => {
  if (!definition.supportedModes.includes(inputMode.value)) {
    inputMode.value = definition.supportedModes[0] ?? 'text';
  }

  if (!definition.supportsThinking) {
    enableThinking.value = true;
  }
});

function addMessage() {
  const lastRole = chatMessages.value.at(-1)?.role;
  const nextRole = lastRole === 'user' ? 'assistant' : 'user';
  chatMessages.value = [...chatMessages.value, createNewChatMessage(nextRole)];
}

function removeMessage(index: number) {
  chatMessages.value = chatMessages.value.filter((_message, messageIndex) => messageIndex !== index);
}

function resetChat() {
  chatMessages.value = createDefaultChatMessages();
}

function getSegmentBackground(segmentIndex: number | null) {
  if (segmentIndex == null) {
    return undefined;
  }

  return colors[segmentIndex % colors.length];
}
</script>

<template>
  <div class="tool-wide" flex flex-col gap-4>
    <c-card>
      <div flex flex-col gap-4>
        <div flex flex-col gap-4 xl:flex-row xl:items-end>
          <div flex-1>
            <c-select v-model:value="modelId" label="Model" :options="tokenizerOptions" searchable />
          </div>

          <n-form-item label="Input mode" :show-feedback="false" mb-0>
            <n-radio-group v-model:value="inputMode">
              <n-radio-button value="text">
                Text
              </n-radio-button>
              <n-radio-button value="chat">
                Chat
              </n-radio-button>
            </n-radio-group>
          </n-form-item>

          <n-form-item v-if="inputMode === 'chat' && currentModel.supportsThinking" label="Thinking" :show-feedback="false" mb-0>
            <n-switch v-model:value="enableThinking" />
          </n-form-item>
        </div>

        <div class="model-hint">
          Available models: {{ availableModelsText }}
        </div>
      </div>
    </c-card>

    <div class="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <div flex flex-col gap-4>
        <c-card v-if="inputMode === 'text'">
          <c-input-text
            v-model:value="plainText"
            label="Input"
            placeholder="Enter text to tokenize..."
            :maxlength="MAX_TOKENIZER_INPUT_LENGTH"

            rows="8"

            raw-text autofocus autosize multiline monospace
          />
        </c-card>

        <c-card v-else>
          <div flex flex-col gap-3>
            <div
              v-for="(message, index) in chatMessages"
              :key="index"
              class="grid gap-3 md:grid-cols-[160px,1fr,auto]"
            >
              <c-select v-model:value="message.role" :options="['system', 'user', 'assistant']" />

              <c-input-text
                v-model:value="message.content"
                :label="`Message ${index + 1}`"
                placeholder="Content"
                multiline
                raw-text
                autosize
                rows="3"
                monospace
                :maxlength="MAX_TOKENIZER_INPUT_LENGTH"
              />

              <div flex items-start justify-end>
                <c-button circle variant="text" :disabled="chatMessages.length <= 1" @click="removeMessage(index)">
                  <n-icon :component="Trash" />
                </c-button>
              </div>
            </div>

            <div flex flex-wrap gap-3>
              <c-button @click="addMessage()">
                Add message
              </c-button>
              <c-button @click="resetChat()">
                Reset chat
              </c-button>
            </div>
          </div>
        </c-card>

        <c-card v-if="inputMode === 'chat'">
          <c-input-text
            :value="serializedInput"
            label="Serialized input"

            rows="6"
            multiline raw-text autosize monospace readonly
          />
        </c-card>
      </div>

      <div flex flex-col gap-4>
        <c-card>
          <div flex items-center justify-between gap-4>
            <n-statistic data-test-id="token-count" label="Token count" :value="result?.count ?? 0" />
            <n-spin v-if="loading" size="small" />
          </div>
        </c-card>

        <n-alert v-if="loadError || serializationError" type="error" :show-icon="false">
          {{ loadError || serializationError }}
        </n-alert>

        <c-card>
          <div mb-3 text-sm opacity-70>
            Tokenized text
          </div>
          <pre class="token-output">
<span
  v-for="(segment, segmentIndex) in result?.segments ?? []"
  :key="segmentIndex"
  class="segment-chip"
  :style="{ backgroundColor: hoveredSegmentIndex == null || hoveredSegmentIndex === segmentIndex ? getSegmentBackground(segmentIndex) : undefined }"
  @mouseenter="hoveredSegmentIndex = segmentIndex"
  @mouseleave="hoveredSegmentIndex = null"
>{{ showWhitespace || hoveredSegmentIndex === segmentIndex ? encodeWhitespace(segment.text) : segment.text }}</span>
          </pre>
        </c-card>

        <div flex items-center gap-3>
          <n-switch v-model:value="showWhitespace" />
          <span>Show whitespace</span>
        </div>

        <c-card>
          <div mb-3 flex items-center justify-between gap-3>
            <div text-sm opacity-70>
              Token IDs
            </div>

            <c-button :disabled="!tokenIdsText" @click="copyTokenIds()">
              {{ isJustCopied ? 'Copied' : 'Copy token IDs' }}
            </c-button>
          </div>

          <div class="token-id-list">
            <template v-for="token in result?.tokens ?? []" :key="token.idx">
              <span
                class="token-id"
                :style="{ backgroundColor: hoveredSegmentIndex === token.segmentIndex ? getSegmentBackground(token.segmentIndex) : undefined }"
                @mouseenter="hoveredSegmentIndex = token.segmentIndex"
                @mouseleave="hoveredSegmentIndex = null"
              >
                {{ token.id }}
              </span>
              <span v-if="token.idx < (result?.tokens.length ?? 0) - 1">, </span>
            </template>
          </div>
        </c-card>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.token-output {
  min-height: 220px;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: var(--n-font-family-mono);
  font-size: 14px;
  line-height: 1.6;
}

.segment-chip {
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.token-id-list {
  min-height: 120px;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: var(--n-font-family-mono);
  font-size: 14px;
  line-height: 1.8;
}

.token-id {
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.model-hint {
  font-size: 13px;
  opacity: 0.7;
}
</style>

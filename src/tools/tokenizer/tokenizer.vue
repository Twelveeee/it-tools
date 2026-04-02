<script setup lang="ts">
import { Trash } from '@vicons/tabler';
import { defaultTokenizerModelId, createDefaultChatMessages, createNewChatMessage } from './tokenizer.models';
import { encodeWhitespace, getTokenizerDefinition, loadTokenizer, tokenizeText, tokenizerRegistry } from './tokenizer.service';
import type { ChatMessage, RuntimeTokenizer, TokenizerInputMode, TokenizationResult } from './tokenizer.models';
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
const runtimeTokenizer = shallowRef<RuntimeTokenizer | null>(null);
const tokenIdsText = computed(() => (result.value?.tokens ?? []).map(({ id }) => id).join(', '));
const availableModelsText = computed(() => tokenizerRegistry.map(({ label }) => label).join(', '));
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
  tokenizerRegistry.map(({ id, label, group }) => ({
    label: group === label ? label : `${group} / ${label}`,
    value: id,
  })),
);

const currentModel = computed(() => getTokenizerDefinition(modelId.value));
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

const result = computed<TokenizationResult | null>(() => {
  if (!runtimeTokenizer.value || loadError.value || serializationError.value) {
    return null;
  }

  return tokenizeText(runtimeTokenizer.value, serializedInput.value);
});

watch(modelId, async (nextModelId, _previousModelId, onCleanup) => {
  let cancelled = false;
  onCleanup(() => {
    cancelled = true;
  });

  loading.value = true;
  loadError.value = '';

  try {
    const tokenizer = await loadTokenizer(nextModelId);
    if (!cancelled) {
      runtimeTokenizer.value = tokenizer;
    }
  }
  catch (error) {
    if (!cancelled) {
      loadError.value = error instanceof Error ? error.message : 'Unable to load tokenizer.';
      runtimeTokenizer.value = null;
    }
  }
  finally {
    if (!cancelled) {
      loading.value = false;
    }
  }
}, { immediate: true });

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

    <div grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]>
      <div flex flex-col gap-4>
        <c-card v-if="inputMode === 'text'">
          <c-input-text
            v-model:value="plainText"
            label="Input"
            placeholder="Enter text to tokenize..."
            multiline
            raw-text
            autosize
            rows="8"
            monospace
            autofocus
          />
        </c-card>

        <c-card v-else>
          <div flex flex-col gap-3>
            <div
              v-for="(message, index) in chatMessages"
              :key="index"
              grid gap-3 md:grid-cols-[160px,1fr,auto]
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
            readonly
            multiline
            raw-text
            autosize
            rows="6"
            monospace
          />
        </c-card>
      </div>

      <div flex flex-col gap-4>
        <c-card>
          <div flex items-center justify-between gap-4>
            <n-statistic label="Token count" :value="result?.count ?? 0" />
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

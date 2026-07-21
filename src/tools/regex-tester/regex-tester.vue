<script setup lang="ts">
import { render } from '@regexper/render';
import type { ShadowRootExpose } from 'vue-shadow-dom';
import type { RegexMatch } from './regex-tester.service';
import { useValidation } from '@/composable/validation';
import { useQueryParamOrStorage } from '@/composable/queryParams';

const regex = useQueryParamOrStorage({ name: 'regex', storageName: 'regex-tester:regex', defaultValue: '' });
const text = ref('');
const MAX_REGEX_LENGTH = 1_000;
const MAX_TEXT_LENGTH = 100_000;
const MAX_DIAGRAM_REGEX_LENGTH = 300;
regex.value = regex.value.slice(0, MAX_REGEX_LENGTH);
const global = ref(true);
const ignoreCase = ref(false);
const multiline = ref(false);
const dotAll = ref(true);
const unicode = ref(true);
const unicodeSets = ref(false);
const visualizerSVG = ref<ShadowRootExpose>();
const results = ref<RegexMatch[]>([]);
const sample = ref('');
const taskError = ref('');
const diagramNotice = ref('');
const processing = ref(false);
let activeWorker: Worker | undefined;
let activeTimeout: number | undefined;
let regexDebounceTimeout: number | undefined;
let diagramDebounceTimeout: number | undefined;
let isDisposed = false;

function stopRegexTask() {
  window.clearTimeout(activeTimeout);
  activeTimeout = undefined;
  activeWorker?.terminate();
  activeWorker = undefined;
}

const regexValidation = useValidation({
  source: regex,
  rules: [
    {
      message: 'Invalid regex: {0}',
      validator: (value) => {
        if (value.length > MAX_REGEX_LENGTH) {
          throw new Error(`Regular expressions are limited to ${MAX_REGEX_LENGTH} characters.`);
        }
        return new RegExp(value);
      },
      getErrorMessage: (value) => {
        const _ = new RegExp(value);
        return '';
      },
    },
  ],
});
const flags = computed(() => {
  let flags = 'd';
  if (global.value) {
    flags += 'g';
  }
  if (ignoreCase.value) {
    flags += 'i';
  }
  if (multiline.value) {
    flags += 'm';
  }
  if (dotAll.value) {
    flags += 's';
  }
  if (unicode.value) {
    flags += 'u';
  }
  else if (unicodeSets.value) {
    flags += 'v';
  }

  return flags;
});

function runRegexTask() {
  if (isDisposed) {
    return;
  }

  stopRegexTask();
  taskError.value = '';
  processing.value = false;

  if (regex.value.length > MAX_REGEX_LENGTH || text.value.length > MAX_TEXT_LENGTH) {
    taskError.value = `Limit exceeded: regex ${MAX_REGEX_LENGTH} characters, text ${MAX_TEXT_LENGTH.toLocaleString()} characters.`;
    results.value = [];
    sample.value = '';
    return;
  }

  const worker = new Worker(new URL('./regex-tester.worker.ts', import.meta.url), { type: 'module' });
  activeWorker = worker;
  processing.value = true;
  activeTimeout = window.setTimeout(() => {
    if (activeWorker !== worker) {
      return;
    }
    worker.terminate();
    activeWorker = undefined;
    activeTimeout = undefined;
    processing.value = false;
    results.value = [];
    sample.value = '';
    taskError.value = 'The regular expression exceeded 750 ms and was stopped.';
  }, 750);

  worker.onmessage = ({ data }: MessageEvent<{ results?: RegexMatch[]; sample?: string; error?: string }>) => {
    if (activeWorker !== worker) {
      return;
    }
    stopRegexTask();
    processing.value = false;
    results.value = data.results ?? [];
    sample.value = data.sample ?? '';
    taskError.value = data.error ?? '';
  };
  worker.onerror = () => {
    if (activeWorker !== worker) {
      return;
    }
    stopRegexTask();
    processing.value = false;
    taskError.value = 'The regular expression worker failed.';
  };
  worker.postMessage({ regex: regex.value, text: text.value, flags: flags.value });
}

function scheduleRegexTask() {
  window.clearTimeout(regexDebounceTimeout);
  regexDebounceTimeout = window.setTimeout(() => {
    regexDebounceTimeout = undefined;
    runRegexTask();
  }, 150);
}

async function renderDiagram() {
  if (isDisposed) {
    return;
  }

  const regexValue = regex.value;
  const visualizer = visualizerSVG.value?.shadow_root;
  if (!visualizer) {
    return;
  }

  while (visualizer.lastChild) {
    visualizer.removeChild(visualizer.lastChild);
  }
  if (regexValue.length > MAX_DIAGRAM_REGEX_LENGTH) {
    diagramNotice.value = `Diagram disabled for expressions longer than ${MAX_DIAGRAM_REGEX_LENGTH} characters.`;
    return;
  }

  diagramNotice.value = '';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  try {
    await render(regexValue, svg);
    if (!isDisposed && regexValue === regex.value) {
      visualizer.appendChild(svg);
    }
  }
  catch (_) {
  }
}

function scheduleDiagram() {
  window.clearTimeout(diagramDebounceTimeout);
  diagramDebounceTimeout = window.setTimeout(() => {
    diagramDebounceTimeout = undefined;
    renderDiagram();
  }, 250);
}

function disposeRegexTester() {
  isDisposed = true;
  window.clearTimeout(regexDebounceTimeout);
  window.clearTimeout(diagramDebounceTimeout);
  regexDebounceTimeout = undefined;
  diagramDebounceTimeout = undefined;
  stopRegexTask();
}

watch([regex, text, flags], scheduleRegexTask);
watch(regex, scheduleDiagram);
onMounted(() => {
  runRegexTask();
  nextTick(renderDiagram);
});
onBeforeUnmount(disposeRegexTester);
</script>

<template>
  <div max-w-600px>
    <c-card title="Regex" mb-1>
      <c-input-text
        v-model:value="regex"
        label="Regex to test:"
        placeholder="Put the regex to test"
        multiline
        rows="3"
        :maxlength="MAX_REGEX_LENGTH"
        :validation="regexValidation"
      />
      <router-link target="_blank" to="/regex-memo" mb-1 mt-1>
        See Regular Expression Cheatsheet
      </router-link>
      <n-space>
        <n-checkbox v-model:checked="global">
          <span title="Global search">Global search. (<code>g</code>)</span>
        </n-checkbox>
        <n-checkbox v-model:checked="ignoreCase">
          <span title="Case-insensitive search">Case-insensitive search. (<code>i</code>)</span>
        </n-checkbox>
        <n-checkbox v-model:checked="multiline">
          <span title="Allows ^ and $ to match next to newline characters.">Multiline(<code>m</code>)</span>
        </n-checkbox>
        <n-checkbox v-model:checked="dotAll">
          <span title="Allows . to match newline characters.">Singleline(<code>s</code>)</span>
        </n-checkbox>
        <n-checkbox v-model:checked="unicode">
          <span title="Unicode; treat a pattern as a sequence of Unicode code points.">Unicode(<code>u</code>)</span>
        </n-checkbox>
        <n-checkbox v-model:checked="unicodeSets">
          <span title="An upgrade to the u mode with more Unicode features.">Unicode Sets (<code>v</code>)</span>
        </n-checkbox>
      </n-space>

      <n-divider />

      <c-input-text
        v-model:value="text"
        label="Text to match:"
        placeholder="Put the text to match"
        multiline
        rows="5"
        :maxlength="MAX_TEXT_LENGTH"
      />
    </c-card>

    <c-alert v-if="taskError" type="error" mt-3 role="alert">
      {{ taskError }}
    </c-alert>
    <p v-else-if="processing" aria-live="polite">
      Evaluating regular expression…
    </p>

    <c-card title="Matches" mb-1 mt-3>
      <n-table v-if="results?.length > 0">
        <thead>
          <tr>
            <th scope="col">
              Index in text
            </th>
            <th scope="col">
              Value
            </th>
            <th scope="col">
              Captures
            </th>
            <th scope="col">
              Groups
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="match of results" :key="match.index">
            <td>{{ match.index }}</td>
            <td>{{ match.value }}</td>
            <td>
              <ul>
                <li v-for="capture in match.captures" :key="capture.name">
                  "{{ capture.name }}" = {{ capture.value }} [{{ capture.start }} - {{ capture.end }}]
                </li>
              </ul>
            </td>
            <td>
              <ul>
                <li v-for="group in match.groups" :key="group.name">
                  "{{ group.name }}" = {{ group.value }} [{{ group.start }} - {{ group.end }}]
                </li>
              </ul>
            </td>
          </tr>
        </tbody>
      </n-table>
      <c-alert v-else>
        No match
      </c-alert>
    </c-card>

    <c-card title="Sample matching text" mt-3>
      <pre style="white-space: pre-wrap; word-break: break-all;">{{ sample }}</pre>
    </c-card>

    <c-card title="Regex Diagram" style="overflow-x: scroll;" mt-3>
      <c-alert v-if="diagramNotice" mb-3>
        {{ diagramNotice }}
      </c-alert>
      <shadow-root ref="visualizerSVG">
&#xa0;
      </shadow-root>
    </c-card>
  </div>
</template>

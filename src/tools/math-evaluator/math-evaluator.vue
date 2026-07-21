<script setup lang="ts">
const expression = ref('');
const result = ref('');
const error = ref('');
const evaluating = ref(false);
let activeWorker: Worker | undefined;
let activeTimeout: number | undefined;

function stopEvaluation() {
  window.clearTimeout(activeTimeout);
  activeTimeout = undefined;
  activeWorker?.terminate();
  activeWorker = undefined;
}

function evaluateExpression() {
  stopEvaluation();
  result.value = '';
  error.value = '';

  if (!expression.value.trim()) {
    return;
  }

  evaluating.value = true;
  const worker = new Worker(new URL('./math-evaluator.worker.ts', import.meta.url), { type: 'module' });
  activeWorker = worker;
  activeTimeout = window.setTimeout(() => {
    if (activeWorker !== worker) {
      return;
    }
    stopEvaluation();
    evaluating.value = false;
    error.value = 'Evaluation exceeded one second and was stopped.';
  }, 1_000);

  worker.onmessage = ({ data }: MessageEvent<{ result?: string; error?: string }>) => {
    if (activeWorker !== worker) {
      return;
    }
    stopEvaluation();
    evaluating.value = false;
    result.value = data.result ?? '';
    error.value = data.error ?? '';
  };
  worker.onerror = () => {
    if (activeWorker !== worker) {
      return;
    }
    stopEvaluation();
    evaluating.value = false;
    error.value = 'The evaluator worker failed.';
  };
  worker.postMessage({ expression: expression.value });
}

onBeforeUnmount(stopEvaluation);
</script>

<template>
  <n-form @submit.prevent="evaluateExpression">
    <c-input-text
      v-model:value="expression"
      rows="1"

      maxlength="1000"
      placeholder="Your math expression (ex: 2*sqrt(6) )..."

      raw-text autofocus autosize multiline monospace
    />

    <div mt-3 flex justify-center>
      <c-button type="primary" native-type="submit" :disabled="evaluating || !expression.trim()">
        {{ evaluating ? 'Evaluating…' : 'Evaluate' }}
      </c-button>
    </div>
  </n-form>

  <c-alert v-if="error" type="error" mt-5 role="alert">
    {{ error }}
  </c-alert>
  <c-card v-if="result !== ''" title="Result" mt-5>
    <output>{{ result }}</output>
  </c-card>
</template>

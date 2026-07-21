<script setup lang="ts">
import type { editor as MonacoEditor } from 'monaco-editor';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import { useStyleStore } from '@/stores/style.store';

const props = withDefaults(defineProps<{ options?: MonacoEditor.IDiffEditorOptions }>(), { options: () => ({}) });
const { options } = toRefs(props);

const editorContainer = ref<HTMLElement | null>(null);
const loading = ref(true);
const loadError = ref('');
let editor: MonacoEditor.IStandaloneDiffEditor | null = null;
let editorModels: MonacoEditor.ITextModel[] = [];
let monacoModule: typeof import('monaco-editor/esm/vs/editor/editor.api') | null = null;
let isDisposed = false;

const workerScope = globalThis as typeof globalThis & {
  MonacoEnvironment?: { getWorker: (_moduleId: string, _label: string) => Worker }
};
workerScope.MonacoEnvironment = {
  getWorker: () => new EditorWorker(),
};

const styleStore = useStyleStore();

watch(
  () => styleStore.isDarkTheme,
  isDarkTheme => monacoModule?.editor.setTheme(isDarkTheme ? 'it-tools-dark' : 'it-tools-light'),
);

watch(
  () => options.value,
  options => editor?.updateOptions(options),
  { immediate: true, deep: true },
);

useResizeObserver(editorContainer, () => {
  editor?.layout();
});

onMounted(async () => {
  try {
    const monaco = await import('monaco-editor/esm/vs/editor/editor.api');
    if (isDisposed || !editorContainer.value) {
      return;
    }

    monacoModule = monaco;
    monaco.editor.defineTheme('it-tools-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#00000000',
      },
    });

    monaco.editor.defineTheme('it-tools-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#00000000',
      },
    });
    monaco.editor.setTheme(styleStore.isDarkTheme ? 'it-tools-dark' : 'it-tools-light');

    editor = monaco.editor.createDiffEditor(editorContainer.value, {
      originalEditable: true,
      minimap: {
        enabled: false,
      },
      ...options.value,
    });

    editorModels = [
      monaco.editor.createModel('', 'plaintext'),
      monaco.editor.createModel('', 'plaintext'),
    ];
    editor.setModel({
      original: editorModels[0],
      modified: editorModels[1],
    });
  }
  catch (error) {
    loadError.value = error instanceof Error ? error.message : 'Unable to load the diff editor.';
  }
  finally {
    loading.value = false;
  }
});

onBeforeUnmount(() => {
  isDisposed = true;
  editor?.dispose();
  editorModels.forEach(model => model.dispose());
  editor = null;
  editorModels = [];
});
</script>

<template>
  <div class="diff-editor-wrapper">
    <div ref="editorContainer" h-600px />

    <div v-if="loading" class="editor-status">
      <n-spin size="large" />
    </div>

    <div v-else-if="loadError" class="editor-status">
      <n-alert type="error" :show-icon="false">
        {{ loadError }}
      </n-alert>
    </div>
  </div>
</template>

<style scoped>
.diff-editor-wrapper {
  position: relative;
  min-height: 600px;
}

.editor-status {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
</style>

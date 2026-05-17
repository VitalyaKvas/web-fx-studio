<script setup lang="ts">
import { computed, ref, shallowRef, watch, onBeforeUnmount } from 'vue'
import { VueMonacoEditor } from '@guolao/vue-monaco-editor'
import type * as MonacoNS from 'monaco-editor'
import '@/utils/monacoSetup'
import { useEditorStore } from '@/stores/editorStore'
import { monacoLanguageFor } from '@/utils/monacoLanguage'
import FileTabs from './FileTabs.vue'
import StatusPill from '@/components/shared/StatusPill.vue'
import Icon from '@/components/shared/Icon.vue'

const editor = useEditorStore()

const activeFile = computed(() => editor.activeFile)
const activeFileLanguage = computed(() => activeFile.value?.language ?? 'javascript')
const monacoLang = computed(() => monacoLanguageFor(activeFileLanguage.value))
const modelPath = computed(() => {
  const p = editor.currentPresetId ?? '_'
  const f = editor.activeFileName ?? 'index.html'
  return `${p}/${f}`
})
const currentValue = computed(() => activeFile.value?.content ?? '')

const editorOptions: MonacoNS.editor.IStandaloneEditorConstructionOptions = {
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  fontSize: 13,
  lineHeight: 20,
  minimap: { enabled: false },
  scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
  wordWrap: 'off',
  smoothScrolling: true,
  scrollBeyondLastLine: false,
  tabSize: 2,
  insertSpaces: true,
  automaticLayout: true,
  fixedOverflowWidgets: true,
  renderLineHighlight: 'gutter',
  bracketPairColorization: { enabled: true },
}

const editorRef = shallowRef<MonacoNS.editor.IStandaloneCodeEditor | null>(null)
const monacoRef = shallowRef<typeof MonacoNS | null>(null)
const cursor = ref({ lineNumber: 1, column: 1 })

function onMount(
  editorInstance: MonacoNS.editor.IStandaloneCodeEditor,
  monacoInstance: typeof MonacoNS,
): void {
  editorRef.value = editorInstance
  monacoRef.value = monacoInstance

  // Track cursor position for the status bar.
  editorInstance.onDidChangeCursorPosition((e) => {
    cursor.value = { lineNumber: e.position.lineNumber, column: e.position.column }
  })

  // Cmd+S / Ctrl+S inside Monaco triggers Run (matches the design's implicit-apply UX).
  editorInstance.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS, () => {
    editor.runPreview()
  })
}

let pushTimer: ReturnType<typeof setTimeout> | null = null
async function onChange(value: string | undefined): Promise<void> {
  const fileName = editor.activeFileName
  if (!fileName || value == null) return
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    editor.updateFileContent(fileName, value)
  }, 60)
}

// Decorate the line that the runtime error points to.
const errorDecoIds = ref<string[]>([])
watch(
  () => [editor.errored, editor.errorDetails, editor.activeFileName, modelPath.value] as const,
  () => {
    const inst = editorRef.value
    const monaco = monacoRef.value
    if (!inst || !monaco) return
    const model = inst.getModel()
    const errored = editor.errored
    const details = editor.errorDetails
    const onMatchingFile = !details?.fileName || details.fileName === editor.activeFileName
    if (!errored || !details?.line || !onMatchingFile || !model) {
      if (errorDecoIds.value.length) {
        errorDecoIds.value = model
          ? model.deltaDecorations(errorDecoIds.value, [])
          : []
      }
      return
    }
    errorDecoIds.value = model.deltaDecorations(errorDecoIds.value, [
      {
        range: new monaco.Range(details.line, 1, details.line, 1),
        options: {
          isWholeLine: true,
          className: 'monaco-error-line',
          glyphMarginClassName: 'monaco-error-glyph',
          linesDecorationsClassName: 'monaco-error-gutter',
        },
      },
    ])
  },
  { immediate: true, deep: true },
)

onBeforeUnmount(() => {
  if (pushTimer) clearTimeout(pushTimer)
})

const lineCount = computed(() => activeFile.value?.content.split('\n').length ?? 0)
const problemsCount = computed(() => (editor.errored ? 1 : 0))
</script>

<template>
  <div class="editor-col">
    <FileTabs />
    <div class="editor-body">
      <VueMonacoEditor
        v-if="activeFile"
        :value="currentValue"
        :default-value="currentValue"
        :language="monacoLang"
        :path="modelPath"
        :save-view-state="true"
        theme="webfx-dark"
        :options="editorOptions"
        class="monaco-host"
        @mount="onMount"
        @change="onChange"
      />
      <div v-else class="empty-state">No file selected.</div>
    </div>
    <div class="editor-statusbar">
      <div class="group">
        <StatusPill tone="accent">{{ activeFileLanguage.toUpperCase() }}</StatusPill>
        <span>Ln {{ cursor.lineNumber }}, Col {{ cursor.column }}</span>
        <span>Spaces: 2</span>
        <span>UTF-8</span>
      </div>
      <div class="group">
        <StatusPill v-if="problemsCount === 0">✓ no problems</StatusPill>
        <StatusPill v-else tone="error">
          <Icon name="warn" :size="9" />
          {{ problemsCount }} problem{{ problemsCount === 1 ? '' : 's' }}
        </StatusPill>
        <span>LF · {{ lineCount }} lines</span>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
// Monaco decoration classes need to be global so Monaco's renderer can find them.
.monaco-error-line {
  background: rgba(255, 81, 96, 0.07);
}
.monaco-error-gutter {
  border-left: 2px solid var(--color-error-red);
}
</style>

<style lang="scss" scoped>
.editor-col {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--color-graphite-surface);
}
.editor-body {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
  background: var(--color-graphite-surface);

  .monaco-host {
    flex: 1;
    min-height: 0;
  }
}
.empty-state {
  flex: 1;
  display: grid;
  place-items: center;
  color: var(--color-ash-dim);
  font-family: var(--font-geist-mono);
  font-size: 12px;
}
.editor-statusbar {
  flex-shrink: 0;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  border-top: 1px solid var(--color-border);
  background: var(--color-graphite-2);
  font-family: var(--font-geist-mono);
  font-size: 11px;
  color: var(--color-ash-dim);

  .group {
    display: inline-flex;
    align-items: center;
    gap: 14px;
  }
}
</style>

import * as monaco from 'monaco-editor'
import { loader } from '@guolao/vue-monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

// Route Monaco's worker factory to Vite-bundled workers. Spec forbids CDN loading.
const monacoEnv: {
  getWorker: (workerId: string, label: string) => Worker
} = {
  getWorker(_workerId: string, label: string): Worker {
    if (label === 'json') return new jsonWorker()
    if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker()
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker()
    if (label === 'typescript' || label === 'javascript') return new tsWorker()
    return new editorWorker()
  },
}

;(self as unknown as { MonacoEnvironment: typeof monacoEnv }).MonacoEnvironment = monacoEnv

// Tell the wrapper to use our locally-bundled monaco instance instead of fetching from CDN.
loader.config({ monaco })

// Register the dark theme our design uses. Custom colors approximate the
// graphite surface / accent blue / token highlights from the prototype.
monaco.editor.defineTheme('webfx-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6F839F', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'c792ea' },
    { token: 'type', foreground: '82aaff' },
    { token: 'string', foreground: 'a5e075' },
    { token: 'number', foreground: 'f78c6c' },
  ],
  colors: {
    'editor.background': '#1e1e1d',
    'editor.foreground': '#fafafa',
    'editorLineNumber.foreground': '#5b5b59',
    'editorLineNumber.activeForeground': '#fafafa',
    'editorCursor.foreground': '#217eff',
    'editor.selectionBackground': '#217eff59',
    'editor.lineHighlightBackground': '#ffffff08',
    'editorGutter.background': '#19191a',
    'editorWidget.background': '#1e1e1d',
    'editorWidget.border': '#353433',
    'editorIndentGuide.background': '#262625',
    'editorIndentGuide.activeBackground': '#353433',
  },
})

export { monaco }

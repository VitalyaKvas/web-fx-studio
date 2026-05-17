<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { buildIframeSrcdoc } from '@/utils/bundler'
import type { IframeBridgeMessage } from '@/types'

const editor = useEditorStore()

const iframeRef = ref<HTMLIFrameElement | null>(null)
const srcdoc = ref<string>('')

function rebuild(): void {
  const preset = editor.currentPreset
  if (!preset) {
    srcdoc.value = ''
    return
  }
  // Inject the current runToken as an HTML comment after <head> so srcdoc
  // differs on every reload — otherwise Vue's diff skips an identical srcdoc,
  // the iframe never reloads, no "iframe bridge ready" arrives, and the
  // "compiling…" overlay never clears.
  const html = buildIframeSrcdoc(preset.files)
  const marker = `<!-- webfx-reload:${editor.runToken} -->`
  srcdoc.value = /<head\b[^>]*>/i.test(html)
    ? html.replace(/(<head\b[^>]*>)/i, `$1${marker}`)
    : marker + html
}

function isBridgeMessage(data: unknown): data is IframeBridgeMessage & { __webfx: true } {
  if (!data || typeof data !== 'object') return false
  const rec = data as Record<string, unknown>
  return rec['__webfx'] === true && typeof rec['type'] === 'string'
}

function onMessage(ev: MessageEvent): void {
  if (ev.source !== iframeRef.value?.contentWindow) return
  if (!isBridgeMessage(ev.data)) return
  editor.handleBridgeMessage({ type: ev.data.type, payload: String(ev.data.payload ?? '') })
}

onMounted(() => {
  window.addEventListener('message', onMessage)
  rebuild()
})

onBeforeUnmount(() => {
  window.removeEventListener('message', onMessage)
})

// Rebuild whenever the user clicks Run (runToken bump) or switches preset.
watch(
  () => [editor.runToken, editor.currentPresetId] as const,
  () => rebuild(),
)
</script>

<template>
  <iframe
    ref="iframeRef"
    class="preview-iframe"
    title="Preview"
    sandbox="allow-scripts allow-same-origin"
    allow="webgpu; xr-spatial-tracking; midi; serial; bluetooth"
    :srcdoc="srcdoc"
  ></iframe>
</template>

<style lang="scss" scoped>
.preview-iframe {
  display: block;
  width: 100%;
  height: 100%;
  border: none;
  background: #0a0a0a;
}
</style>

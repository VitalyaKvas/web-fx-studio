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
  srcdoc.value = buildIframeSrcdoc(preset.files)
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

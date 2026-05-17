<script setup lang="ts">
import { defineAsyncComponent, onMounted, onBeforeUnmount, watch } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { usePresetsStore } from '@/stores/presetsStore'

import AppHeader from '@/components/header/AppHeader.vue'
import PresetList from '@/components/sidebar/PresetList.vue'
import CreatePresetModal from '@/components/sidebar/CreatePresetModal.vue'
import WorkspaceGrid from '@/components/workspace/WorkspaceGrid.vue'
import MobileTabbar from '@/components/workspace/MobileTabbar.vue'
import PreviewPane from '@/components/preview/PreviewPane.vue'
import FileTree from '@/components/editor/FileTree.vue'
import ConsolePanel from '@/components/console/ConsolePanel.vue'

// Monaco is heavy — keep it out of the initial paint and load on demand.
const MonacoEditor = defineAsyncComponent(() => import('@/components/editor/MonacoEditor.vue'))

const editor = useEditorStore()
const presets = usePresetsStore()

function pickDefaultPreset(): void {
  const preferredId = 'wgsl-waves'
  const fallback = presets.builtins[0]?.id ?? presets.custom[0]?.id
  const target = presets.byId(preferredId)?.id ?? fallback
  if (target) editor.setActivePreset(target)
}

function onKey(e: KeyboardEvent): void {
  // Cmd/Ctrl + R → Run preview (and stop the browser reload)
  if ((e.metaKey || e.ctrlKey) && (e.key === 'r' || e.key === 'R')) {
    e.preventDefault()
    editor.runPreview()
  }
}

onMounted(async () => {
  const result = await presets.init()
  if (result.builtinError) {
    editor.appendLog('error', `Built-in presets failed to load: ${escape(result.builtinError)}`)
  }
  if (result.customError) {
    editor.appendLog('error', `Custom presets failed to load: ${escape(result.customError)}`)
  }
  pickDefaultPreset()
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
})

// When presets finish loading after mount (e.g. slow manifest fetch), default
// preset selection runs again so the editor isn't left empty.
watch(
  () => presets.ready,
  (ready) => {
    if (ready && !editor.currentPresetId) pickDefaultPreset()
  },
)

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
</script>

<template>
  <div class="app" :data-mobile-pane="editor.mobilePane">
    <AppHeader />
    <div class="body" :data-sidebar="editor.sidebarVisible ? 'on' : 'off'">
      <PresetList />
      <WorkspaceGrid>
        <template #preview>
          <PreviewPane />
        </template>
        <template #files>
          <FileTree />
        </template>
        <template #editor>
          <MonacoEditor />
        </template>
        <template #console>
          <ConsolePanel />
        </template>
      </WorkspaceGrid>
    </div>
    <MobileTabbar />
    <CreatePresetModal v-if="editor.showCreateModal" @close="editor.closeCreateModal" />
  </div>
</template>

<style lang="scss" scoped>
.app {
  height: 100vh;
  display: grid;
  grid-template-rows: 48px 1fr;
  background: var(--color-midnight-base);

  @include breakpoint-mobile {
    grid-template-rows: 52px 1fr 56px;
  }
}

.body {
  display: grid;
  grid-template-columns: 248px 1fr;
  min-height: 0;

  &[data-sidebar='off'] {
    // Collapse to a single column. `display: none` on the sidebar would remove
    // it from the grid and shift the workspace into the now-empty first track,
    // pinning the workspace to its min-content (~391px) instead of giving it
    // the full row.
    grid-template-columns: 1fr;

    :deep(.sidebar) {
      display: none;
    }
  }

  @include breakpoint-tablet {
    grid-template-columns: 220px 1fr;
  }

  @include breakpoint-mobile {
    grid-template-columns: 1fr !important;
    grid-template-rows: 56px 1fr;
    position: relative;
  }
}

// Mobile pane visibility — only show the active pane under 760px.
@include breakpoint-mobile {
  .app[data-mobile-pane='preview'] :deep(.preview-pane) {
    display: flex !important;
    border: none !important;
  }
  .app[data-mobile-pane='editor'] :deep(.editor-pane) {
    display: grid !important;
    grid-template-columns: 140px 1fr;
    border-top: none;
  }
  .app[data-mobile-pane='console'] :deep(.console) {
    display: flex !important;
    border-top: none;
  }
}
</style>

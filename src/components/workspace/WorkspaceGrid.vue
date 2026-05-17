<script setup lang="ts">
import { useEditorStore } from '@/stores/editorStore'

const editor = useEditorStore()
</script>

<template>
  <div class="workspace" :data-layout="editor.layout">
    <div class="upper">
      <slot name="preview" />
      <div class="editor-pane">
        <slot name="files" />
        <slot name="editor" />
      </div>
    </div>
    <slot name="console" />
  </div>
</template>

<style lang="scss" scoped>
.workspace {
  display: grid;
  grid-template-rows: 1fr 200px;
  min-height: 0;
}

.upper {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 0;
  border-bottom: 1px solid var(--color-border);
}

.editor-pane {
  display: grid;
  grid-template-columns: 200px 1fr;
  min-height: 0;
  background: var(--color-graphite-surface);
}

// Layout variants — selectors apply to the descendants slotted into us.
// Default in DOM order is `preview-left` (preview rendered first); CSS rules
// rearrange for the other layouts.

// preview-right — preview becomes the second column
:deep(.preview-pane) {
  order: 0;
}
.workspace[data-layout='preview-right'] {
  :deep(.preview-pane) {
    order: 2;
    border-right: none;
    border-left: 1px solid var(--color-border);
  }
  .editor-pane {
    order: 1;
  }
}

// stacked — preview row + editor row
.workspace[data-layout='stacked'] .upper {
  grid-template-columns: 1fr;
  grid-template-rows: minmax(220px, 45%) 1fr;
}
.workspace[data-layout='stacked'] :deep(.preview-pane) {
  border-right: none;
  border-bottom: 1px solid var(--color-border);
}

// editor-focus — preview becomes floating PiP
.workspace[data-layout='editor-focus'] .upper {
  grid-template-columns: 1fr;
  position: relative;
}
.workspace[data-layout='editor-focus'] :deep(.preview-pane) {
  position: absolute;
  right: 16px;
  bottom: 16px;
  width: 280px;
  height: 220px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-lg);
  overflow: hidden;
  z-index: 20;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(33, 126, 255, 0.18);
}

@include breakpoint-tablet {
  .editor-pane {
    grid-template-columns: 168px 1fr;
  }
  .workspace {
    grid-template-rows: 1fr 180px;
  }
}

@include breakpoint-mobile {
  .workspace {
    grid-template-rows: 1fr !important;
  }
  .upper {
    grid-template-columns: 1fr !important;
    grid-template-rows: 1fr !important;
    border-bottom: none;
  }
  :deep(.preview-pane),
  .editor-pane,
  :deep(.console) {
    display: none !important;
  }
}
</style>

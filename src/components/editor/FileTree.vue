<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { usePresetsStore } from '@/stores/presetsStore'
import { slugify } from '@/utils/slug'
import Icon from '@/components/shared/Icon.vue'
import StatusPill from '@/components/shared/StatusPill.vue'

const editor = useEditorStore()
const presets = usePresetsStore()

const preset = computed(() => editor.currentPreset)
const fileNames = computed(() => (preset.value ? Object.keys(preset.value.files) : []))
const folderSlug = computed(() => (preset.value ? slugify(preset.value.name) : 'untitled'))

function extColor(language: string): string {
  switch (language) {
    case 'html':
      return '#e34c26'
    case 'javascript':
    case 'typescript':
      return '#f5d27e'
    case 'glsl':
      return '#2f7eff'
    case 'wgsl':
      return '#a371f7'
    case 'css':
      return '#2965f1'
    case 'svg':
      return '#ffb13b'
    case 'json':
      return '#cbcb41'
    default:
      return '#666'
  }
}

function onSelectFile(name: string): void {
  editor.openFile(name)
}

function onActivate(e: KeyboardEvent, name: string): void {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    onSelectFile(name)
  }
}

// suppress unused-import noise from presets store reactivity.
void presets
</script>

<template>
  <div class="files-col">
    <div class="pane-header">
      <div class="pane-title">
        <Icon name="folder" :size="12" />
        Files
      </div>
    </div>
    <div class="file-tree" role="tree" :aria-label="`Files in ${preset?.name ?? 'preset'}`">
      <div class="file-folder-label">
        <Icon name="folder" :size="11" />
        /{{ folderSlug }}
      </div>
      <div
        v-for="name in fileNames"
        :key="name"
        :class="['file-row', { active: name === editor.activeFileName }]"
        role="treeitem"
        :aria-selected="name === editor.activeFileName"
        tabindex="0"
        @click="onSelectFile(name)"
        @keydown="onActivate($event, name)"
      >
        <span
          class="ext"
          :style="{ background: extColor(preset?.files[name]?.language ?? '') }"
          aria-hidden="true"
        />
        <span class="name">{{ name }}</span>
        <span v-if="preset?.files[name]?.isDirty" class="dirty" aria-label="Modified">*</span>
      </div>
    </div>
    <div class="files-statusbar">
      <StatusPill>{{ fileNames.length }} files</StatusPill>
      <span class="branch"><Icon name="git" :size="10" /> main</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.files-col {
  background: var(--color-graphite-2);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.pane-header {
  @include pane-header;
  border-right: none;
}
.pane-title {
  display: flex;
  align-items: center;
  gap: 8px;
  @include mono-uppercase(12px, 0.06em);
  color: var(--color-ash-text);
}
.file-tree {
  padding: 6px 6px;
  flex: 1;
  overflow: auto;
}
.file-folder-label {
  @include mono-uppercase(10px, 0.1em);
  color: var(--color-ash-dim);
  padding: 6px 8px 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.file-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: var(--color-subtle-cream);
  font-family: var(--font-geist-mono);
  letter-spacing: -0.01em;
  position: relative;

  &:hover {
    background: rgba(255, 255, 255, 0.035);
  }
  &.active {
    background: rgba(33, 126, 255, 0.1);
    color: var(--color-highlight-white);

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 4px;
      bottom: 4px;
      width: 2px;
      background: var(--color-accent-blue);
      border-radius: 0 2px 2px 0;
    }
  }
  .ext {
    width: 12px;
    height: 12px;
    border-radius: 2px;
    flex-shrink: 0;
  }
  .name {
    flex: 1;
    @include truncate;
  }
  .dirty {
    color: var(--color-accent-blue);
    font-size: 14px;
    line-height: 1;
  }
}
.files-statusbar {
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

  .branch {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
}
</style>

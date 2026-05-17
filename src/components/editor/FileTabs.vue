<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editorStore'
import { usePresetsStore } from '@/stores/presetsStore'
import Icon from '@/components/shared/Icon.vue'

const editor = useEditorStore()
const presets = usePresetsStore()

const tabs = computed(() => {
  const preset = editor.currentPreset
  if (!preset) return []
  return editor.openTabs
    .filter((name) => preset.files[name])
    .map((name) => ({
      name,
      dirty: !!preset.files[name]?.isDirty,
    }))
})

function onSelect(name: string): void {
  const preset = editor.currentPreset
  if (preset) presets.setActiveFile(preset.id, name)
}
function onClose(name: string): void {
  editor.closeTab(name)
}
</script>

<template>
  <div class="tab-row" role="tablist" aria-label="Open files">
    <button
      v-for="t in tabs"
      :key="t.name"
      type="button"
      role="tab"
      :aria-selected="t.name === editor.activeFileName"
      :class="['tab', { active: t.name === editor.activeFileName }]"
      @click="onSelect(t.name)"
    >
      <span v-if="t.dirty" class="dirty" aria-hidden="true" />
      <span class="label">{{ t.name }}</span>
      <span
        class="close"
        role="button"
        :aria-label="`Close ${t.name}`"
        tabindex="0"
        @click.stop="onClose(t.name)"
        @keydown.enter.prevent="onClose(t.name)"
        @keydown.space.prevent="onClose(t.name)"
      >
        <Icon name="close" :size="10" />
      </span>
    </button>
    <div class="filler" aria-hidden="true" />
  </div>
</template>

<style lang="scss" scoped>
.tab-row {
  height: 36px;
  display: flex;
  align-items: stretch;
  background: var(--color-graphite-2);
  border-bottom: 1px solid var(--color-border);
  overflow-x: auto;
  flex-shrink: 0;
}
.tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  font-family: var(--font-geist-mono);
  font-size: 12px;
  color: var(--color-ash-text);
  background: transparent;
  border: none;
  border-right: 1px solid var(--color-border);
  position: relative;
  white-space: nowrap;
  letter-spacing: -0.01em;

  &:hover {
    color: var(--color-subtle-cream);
    background: rgba(255, 255, 255, 0.02);
  }
  &.active {
    color: var(--color-highlight-white);
    background: var(--color-graphite-surface);

    &::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
      height: 2px;
      background: var(--color-accent-blue);
    }
  }
  .label {
    flex-shrink: 0;
  }
  .dirty {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-accent-blue);
    display: inline-block;
  }
  .close {
    width: 14px;
    height: 14px;
    border-radius: 2px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--color-ash-dim);

    &:hover {
      background: rgba(255, 255, 255, 0.08);
      color: var(--color-subtle-cream);
    }
  }
}
.filler {
  flex: 1;
}
</style>
